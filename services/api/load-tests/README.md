# Load Testing with K6

This directory contains load tests for the GroomLink API using [K6](https://k6.io/).

## Prerequisites

Install K6:
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (via Chocolatey)
choco install k6
```

## Test Types

### 1. Smoke Test
Quick verification that the system works under minimal load.
```bash
k6 run smoke-test.js
```

### 2. Load Test
Simulates normal traffic patterns with gradual ramp-up and ramp-down.
```bash
k6 run load-test.js
```

### 3. Stress Test
Pushes the system beyond normal capacity to find breaking points.
```bash
k6 run stress-test.js
```

### 4. Spike Test
Tests system's ability to handle sudden traffic surges.
```bash
k6 run spike-test.js
```

## Configuration

Set environment variables to customize tests:

```bash
# Change target API URL
export BASE_URL=https://api.groomlink.com/api

# Run with custom options
k6 run --vus 100 --duration 5m load-test.js
```

## Interpreting Results

Key metrics to watch:
- **http_req_duration**: Request response times (p95 should be < 500ms)
- **http_req_failed**: Error rate (should be < 1%)
- **http_reqs**: Requests per second
- **vus**: Virtual users (concurrent connections)

## CI/CD Integration

Run tests in CI pipeline:
```bash
# Quick smoke test on every commit
k6 run --quiet smoke-test.js

# Full load test on staging
k6 run --out json=results.json load-test.js
```

## Performance Thresholds

Current targets:
- Response time p95: < 500ms (normal), < 1000ms (stress)
- Error rate: < 1% (normal), < 5% (stress)
- Throughput: > 100 RPS

Adjust thresholds in `config.js` based on your infrastructure.
