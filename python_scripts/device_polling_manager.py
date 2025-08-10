#!/usr/bin/env python3
"""
Device Polling Manager for Philips Air Purifiers
This module provides a persistent polling interface to prevent device hangs
"""

import asyncio
import json
import time
import logging
from typing import Dict, Optional, Callable, Any
from dataclasses import dataclass, field
from aioairctrl import CoAPClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DeviceConfig:
    """Configuration for a device"""
    ip: str
    port: int = 5683
    protocol: str = "coaps"
    poll_interval: int = 30  # seconds
    timeout: int = 15  # seconds
    max_retries: int = 3
    retry_delay: int = 5  # seconds

@dataclass
class DeviceStatus:
    """Current status of a device"""
    last_update: float = field(default_factory=time.time)
    last_success: float = field(default_factory=time.time)
    status_data: Optional[Dict[str, Any]] = None
    is_connected: bool = False
    error_count: int = 0
    last_error: Optional[str] = None

class DevicePollingManager:
    """Manages persistent connections and polling for Philips Air Purifiers"""

    def __init__(self):
        self.devices: Dict[str, DeviceConfig] = {}
        self.status_cache: Dict[str, DeviceStatus] = {}
        self.clients: Dict[str, CoAPClient] = {}
        self.polling_tasks: Dict[str, asyncio.Task] = {}
        self.status_callbacks: Dict[str, Callable[[str, Dict[str, Any]], None]] = {}
        self.running = False
        self._lock = asyncio.Lock()

    async def add_device(self, device_id: str, config: DeviceConfig,
                        status_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None):
        """Add a device to the polling manager"""
        async with self._lock:
            self.devices[device_id] = config
            self.status_cache[device_id] = DeviceStatus()
            if status_callback:
                self.status_callbacks[device_id] = status_callback

            logger.info(f"Added device {device_id} at {config.ip}:{config.port}")

            # Start polling if manager is running
            if self.running:
                await self._start_device_polling(device_id)

    async def remove_device(self, device_id: str):
        """Remove a device from the polling manager"""
        async with self._lock:
            if device_id in self.polling_tasks:
                self.polling_tasks[device_id].cancel()
                del self.polling_tasks[device_id]

            if device_id in self.clients:
                try:
                    await self.clients[device_id].shutdown()
                except Exception as e:
                    logger.warning(f"Error shutting down client for {device_id}: {e}")
                del self.clients[device_id]

            if device_id in self.devices:
                del self.devices[device_id]

            if device_id in self.status_cache:
                del self.status_cache[device_id]

            if device_id in self.status_callbacks:
                del self.status_callbacks[device_id]

            logger.info(f"Removed device {device_id}")

    async def start(self):
        """Start the polling manager"""
        if self.running:
            logger.warning("Polling manager is already running")
            return

        self.running = True
        logger.info("Starting device polling manager")

        # Start polling for all devices
        for device_id in self.devices:
            await self._start_device_polling(device_id)

    async def stop(self):
        """Stop the polling manager"""
        if not self.running:
            logger.warning("Polling manager is not running")
            return

        self.running = False
        logger.info("Stopping device polling manager")

        # Cancel all polling tasks
        for device_id, task in self.polling_tasks.items():
            task.cancel()

        # Wait for all tasks to complete
        if self.polling_tasks:
            await asyncio.gather(*self.polling_tasks.values(), return_exceptions=True)

        # Shutdown all clients
        for device_id, client in self.clients.items():
            try:
                await client.shutdown()
            except Exception as e:
                logger.warning(f"Error shutting down client for {device_id}: {e}")

        self.polling_tasks.clear()
        self.clients.clear()
        logger.info("Device polling manager stopped")

    async def _start_device_polling(self, device_id: str):
        """Start polling for a specific device"""
        if device_id in self.polling_tasks:
            self.polling_tasks[device_id].cancel()

        self.polling_tasks[device_id] = asyncio.create_task(
            self._poll_device_loop(device_id)
        )
        logger.info(f"Started polling for device {device_id}")

    async def _poll_device_loop(self, device_id: str):
        """Main polling loop for a device"""
        config = self.devices[device_id]
        status = self.status_cache[device_id]

        while self.running and device_id in self.devices:
            try:
                # Poll the device
                await self._poll_device(device_id)

                # Wait for next poll interval
                await asyncio.sleep(config.poll_interval)

            except asyncio.CancelledError:
                logger.info(f"Polling cancelled for device {device_id}")
                break
            except Exception as e:
                logger.error(f"Error in polling loop for device {device_id}: {e}")
                await asyncio.sleep(config.retry_delay)

    async def _poll_device(self, device_id: str):
        """Poll a single device for status"""
        config = self.devices[device_id]
        status = self.status_cache[device_id]

        try:
            # Get or create client
            client = await self._get_or_create_client(device_id)
            if not client:
                return

            # Get device status
            logger.debug(f"Polling device {device_id} at {config.ip}:{config.port}")
            device_status = await asyncio.wait_for(
                client.get_status(),
                timeout=config.timeout
            )

            # Handle different return types from get_status()
            if isinstance(device_status, tuple):
                # If it's a tuple, try to extract the status data
                if len(device_status) > 0:
                    device_status = device_status[0]  # Take first element
                    logger.debug(f"Extracted status from tuple: {type(device_status)}")
                else:
                    device_status = {}
            elif device_status is None:
                device_status = {}

            # Ensure we have a dictionary
            if not isinstance(device_status, dict):
                logger.warning(f"Unexpected status type from {device_id}: {type(device_status)}")
                device_status = {"raw_status": str(device_status)}

            # Update status cache
            status.status_data = device_status
            status.last_update = time.time()
            status.last_success = time.time()
            status.is_connected = True
            status.error_count = 0
            status.last_error = None

            logger.debug(f"Successfully polled device {device_id}, got {len(device_status)} fields")

            # Call status callback if provided
            if device_id in self.status_callbacks:
                try:
                    self.status_callbacks[device_id](device_id, device_status)
                except Exception as e:
                    logger.error(f"Error in status callback for {device_id}: {e}")
                    logger.debug(f"Status data that caused error: {device_status}")

        except asyncio.TimeoutError:
            await self._handle_device_error(device_id, "Timeout getting device status")
        except Exception as e:
            await self._handle_device_error(device_id, f"Error polling device: {e}")

    async def _get_or_create_client(self, device_id: str) -> Optional[CoAPClient]:
        """Get existing client or create new one"""
        if device_id in self.clients:
            return self.clients[device_id]

        config = self.devices[device_id]

        try:
            logger.debug(f"Creating new client for device {device_id}")
            client = CoAPClient(config.ip, port=config.port)
            await asyncio.wait_for(client._init(), timeout=config.timeout)

            self.clients[device_id] = client
            logger.debug(f"Successfully created client for device {device_id}")
            return client

        except Exception as e:
            logger.error(f"Failed to create client for device {device_id}: {e}")
            await self._handle_device_error(device_id, f"Client creation failed: {e}")
            return None

    async def _handle_device_error(self, device_id: str, error_msg: str):
        """Handle device errors and implement retry logic"""
        status = self.status_cache[device_id]
        config = self.devices[device_id]

        status.error_count += 1
        status.last_error = error_msg
        status.is_connected = False

        logger.warning(f"Device {device_id} error ({status.error_count}/{config.max_retries}): {error_msg}")

        # Remove client on error to force recreation
        if device_id in self.clients:
            try:
                await self.clients[device_id].shutdown()
            except Exception as e:
                logger.debug(f"Error shutting down client for {device_id}: {e}")
            del self.clients[device_id]

        # If max retries exceeded, mark as disconnected
        if status.error_count >= config.max_retries:
            logger.error(f"Device {device_id} exceeded max retries, marking as disconnected")
            status.is_connected = False

    async def get_device_status(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Get cached status for a device"""
        if device_id in self.status_cache:
            return self.status_cache[device_id].status_data
        return None

    async def force_poll_device(self, device_id: str):
        """Force an immediate poll of a device"""
        if device_id in self.devices and self.running:
            await self._poll_device(device_id)

    def get_device_info(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Get device information and status"""
        if device_id not in self.devices:
            return None

        config = self.devices[device_id]
        status = self.status_cache[device_id]

        return {
            "device_id": device_id,
            "ip": config.ip,
            "port": config.port,
            "protocol": config.protocol,
            "poll_interval": config.poll_interval,
            "is_connected": status.is_connected,
            "last_update": status.last_update,
            "last_success": status.last_success,
            "error_count": status.error_count,
            "last_error": status.last_error,
            "has_status_data": status.status_data is not None
        }

    def get_all_devices_info(self) -> Dict[str, Dict[str, Any]]:
        """Get information for all devices"""
        return {
            device_id: self.get_device_info(device_id)
            for device_id in self.devices
        }

# Example usage and testing
async def example_usage():
    """Example of how to use the DevicePollingManager"""

    # Create manager
    manager = DevicePollingManager()

    # Add devices
    device1_config = DeviceConfig(
        ip="192.168.88.150",
        port=5683,
        protocol="coaps",
        poll_interval=30,
        timeout=15
    )

    device2_config = DeviceConfig(
        ip="192.168.88.190",
        port=5683,
        protocol="coaps",
        poll_interval=45,
        timeout=15
    )

    # Status callback function
    def status_callback(device_id: str, status_data: Dict[str, Any]):
        print(f"Status update for {device_id}: {json.dumps(status_data, indent=2)}")

    await manager.add_device("device1", device1_config, status_callback)
    await manager.add_device("device2", device2_config, status_callback)

    # Start polling
    await manager.start()

    try:
        # Let it run for a while
        await asyncio.sleep(120)  # 2 minutes

        # Get device info
        print("Device info:", json.dumps(manager.get_all_devices_info(), indent=2))

    finally:
        # Stop polling
        await manager.stop()

if __name__ == "__main__":
    # Run example if script is executed directly
    asyncio.run(example_usage())
