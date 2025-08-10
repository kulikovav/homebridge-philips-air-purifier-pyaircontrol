#!/bin/bash

# Script to run aioairctrl tests in Docker environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Function to run basic tests
run_basic_tests() {
    print_status "Running basic library tests..."
    docker run --rm -v "$(pwd):/app" -w /app python:3.9-slim bash -c "
        pip install --no-cache-dir -r requirements.txt
        python3 test_basic.py
    "
}

# Function to run network tests
run_network_tests() {
    local ip=${1:-"192.168.88.150"}
    local protocol=${2:-"coaps"}

    print_status "Running network tests with IP: $ip, Protocol: $protocol"

    # Build the image
    print_status "Building Docker image..."
    docker build -t aioairctrl-test .

    # Run the network test
    print_status "Running network connectivity test..."
    docker run --rm aioairctrl-test python3 test_network.py "$ip" 15
}

# Function to run simple network tests
run_simple_network_tests() {
    local ip=${1:-"192.168.88.150"}
    local protocol=${2:-"coaps"}

    print_status "Running simple network tests with IP: $ip, Protocol: $protocol"

    # Build the image
    print_status "Building Docker image..."
    docker build -t aioairctrl-test .

    # Run the simple test
    print_status "Running simple network test..."
    docker run --rm aioairctrl-test python3 test_simple.py "$ip" "$protocol"
}

# Function to run network scanning
run_network_scan() {
    print_status "Running network scan to find Philips Air Purifiers..."
    print_status "Building Docker image..."
    docker build -t aioairctrl-test .
    print_status "Starting network scan..."
    docker run --rm aioairctrl-test python3 scan_network.py
}

# Function to test common IP addresses
run_common_ips_test() {
    local ip=${1:-"192.168.88.190"}
    print_status "Testing common IP addresses for Philips Air Purifiers..."
    print_status "Building Docker image..."
    docker build -t aioairctrl-test .
    print_status "Testing common IPs..."
    docker run --rm aioairctrl-test python3 test_common_ips.py
}

# Function to test a specific IP address
run_specific_ip_test() {
    local ip=${1:-"192.168.88.190"}
    local protocol=${2:-"coaps"}
    print_status "Testing specific IP: $ip with protocol: $protocol..."
    print_status "Building Docker image..."
    docker build -t aioairctrl-test .
    print_status "Testing specific IP..."
    docker run --rm aioairctrl-test python3 test_simple.py "$ip" "$protocol"
}

# Function to run advanced tests with multiple ports
run_advanced_test() {
    print_status "Running advanced tests with multiple ports..."
    print_status "Building Docker image..."
    docker build -t aioairctrl-test .
    print_status "Running advanced tests..."
    docker run --rm aioairctrl-test python3 test_advanced.py
}

# Function to test the polling manager
run_polling_test() {
    local ip=${1:-"192.168.88.190"}
    local protocol=${2:-"coaps"}
    print_status "Testing polling manager with IP: $ip, Protocol: $protocol..."
    print_status "Building Docker image..."
    docker build -t aioairctrl-test .
    print_status "Running polling manager test..."
    docker run --rm aioairctrl-test python3 test_polling_simple.py
}

# Function to run all tests
run_all_tests() {
    print_status "Running all tests..."

    # Run basic tests first
    run_basic_tests

    echo
    print_status "Basic tests completed. Running network tests..."

    # Run network tests
    run_network_tests
}

# Function to clean up Docker resources
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker rmi aioairctrl-test 2>/dev/null || true
    docker system prune -f > /dev/null 2>&1 || true
    print_status "Cleanup completed"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION] [IP] [PROTOCOL]"
    echo ""
    echo "Options:"
    echo "  basic                    Run basic library tests (no network access)"
    echo "  network [IP] [PROTOCOL] Run comprehensive network tests"
    echo "  simple [IP] [PROTOCOL]  Run simple network tests"
    echo "  scan                     Scan network for Philips Air Purifiers"
    echo "  common [IP]             Test common IP addresses for Philips Air Purifiers"
    echo "  specific [IP] [PROTOCOL] Test a specific IP address"
    echo "  advanced                 Run advanced tests with multiple ports"
    echo "  polling [IP] [PROTOCOL] Test the polling manager (prevents device hangs)"
    echo "  cleanup                  Clean up Docker containers and images"
    echo "  help                     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 basic"
    echo "  $0 network 192.168.88.150 coaps"
    echo "  $0 simple 192.168.88.150 coaps"
    echo "  $0 scan"
    echo "  $0 common"
    echo "  $0 specific 192.168.88.190 coaps"
    echo "  $0 advanced"
    echo "  $0 polling 192.168.88.190 coaps"
    echo ""
    echo "Default values:"
    echo "  IP: 192.168.88.150 (for network/simple), 192.168.88.190 (for common/specific/polling)"
    echo "  PROTOCOL: coaps"
}

# Main script logic
case "${1:-help}" in
    "basic")
        run_basic_tests
        ;;
    "network")
        run_network_tests "$2" "$3"
        ;;
    "simple")
        run_simple_network_tests "$2" "$3"
        ;;
    "scan")
        run_network_scan
        ;;
    "common")
        run_common_ips_test "$2"
        ;;
    "specific")
        run_specific_ip_test "$2" "$3"
        ;;
    "advanced")
        run_advanced_test
        ;;
    "polling")
        run_polling_test "$2" "$3"
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|*)
        show_usage
        ;;
esac

print_status "Tests completed!"
