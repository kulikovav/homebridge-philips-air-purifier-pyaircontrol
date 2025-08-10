FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git iputils-ping dnsutils telnet \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy test scripts
COPY *.py .

# Set Python path
ENV PYTHONPATH=/app

# Default command
CMD ["python3", "test_simple.py", "192.168.88.150", "coaps"]
