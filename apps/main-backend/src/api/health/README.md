# Health Check Endpoints

This module provides comprehensive health monitoring endpoints for the FundifyHub main backend service.

## Endpoints

### 1. Basic Health (`GET /api/v1/health`)

Simple health check that returns minimal status information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-04T09:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Use cases:**
- Quick health verification
- Simple uptime monitoring
- Load balancer health checks

---

### 2. Detailed Health (`GET /api/v1/health/detailed`)

Comprehensive health check that includes status of all dependencies.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-04T09:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "pass",
      "responseTime": 45,
      "message": "Database connected"
    },
    "redis": {
      "status": "pass",
      "responseTime": 12,
      "message": "Redis connected"
    },
    "memory": {
      "status": "pass",
      "message": "Memory within limits",
      "details": {
        "heapUsedMB": 150,
        "heapTotalMB": 512,
        "heapUsagePercent": 29,
        "rssMB": 200
      }
    }
  }
}
```

**Status codes:**
- `200` - Healthy or degraded (all checks pass, or some have warnings)
- `503` - Unhealthy (one or more critical checks failed)

**Check statuses:**
- `pass` - Check successful, within normal parameters
- `warn` - Check successful but with performance concerns
- `fail` - Check failed

**Use cases:**
- Detailed system monitoring
- Troubleshooting dependency issues
- System observability dashboards

---

### 3. Readiness Probe (`GET /api/v1/health/ready`)

Kubernetes-style readiness probe that checks if the service is ready to accept traffic.

**Response (Ready):**
```json
{
  "status": "ready",
  "timestamp": "2025-12-04T09:00:00.000Z"
}
```

**Response (Not Ready):**
```json
{
  "status": "not_ready",
  "timestamp": "2025-12-04T09:00:00.000Z"
}
```

**Status codes:**
- `200` - Service is ready
- `503` - Service is not ready

**Use cases:**
- Kubernetes readiness probe configuration
- Load balancer traffic routing decisions
- Deployment health checks

---

### 4. Liveness Probe (`GET /api/v1/health/live`)

Kubernetes-style liveness probe that checks if the process is alive.

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2025-12-04T09:00:00.000Z",
  "uptime": 3600
}
```

**Status codes:**
- `200` - Process is alive

**Use cases:**
- Kubernetes liveness probe configuration
- Container restart decisions
- Process monitoring

---

## Health Check Criteria

### Database Check
- **Pass**: Response time < 100ms
- **Warn**: Response time >= 100ms
- **Fail**: Connection failed

### Redis Check
- **Pass**: Response time < 50ms
- **Warn**: Response time >= 50ms
- **Fail**: Connection failed

### Memory Check
- **Pass**: Heap usage < 80%
- **Warn**: Heap usage >= 80% and < 90%
- **Fail**: Heap usage >= 90%

---

## Kubernetes Configuration Example

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fundifyhub-backend
spec:
  containers:
  - name: main-backend
    image: fundifyhub/main-backend:latest
    
    # Readiness probe - when to route traffic
    readinessProbe:
      httpGet:
        path: /api/v1/health/ready
        port: 3001
      initialDelaySeconds: 10
      periodSeconds: 5
      failureThreshold: 3
    
    # Liveness probe - when to restart
    livenessProbe:
      httpGet:
        path: /api/v1/health/live
        port: 3001
      initialDelaySeconds: 30
      periodSeconds: 10
      failureThreshold: 3
```

---

## Monitoring Integration

### Prometheus

For Prometheus monitoring, use the detailed health endpoint or wait for the metrics endpoint (Phase 7.2.5).

### DataDog / New Relic

Configure your APM tool to scrape the `/api/v1/health/detailed` endpoint for comprehensive metrics.

### AWS Load Balancer

Configure target group health checks to use `/api/v1/health` or `/api/v1/health/ready`.

---

## Development

### Testing Health Endpoints

```bash
# Basic health
curl http://localhost:3001/api/v1/health

# Detailed health
curl http://localhost:3001/api/v1/health/detailed

# Readiness
curl http://localhost:3001/api/v1/health/ready

# Liveness
curl http://localhost:3001/api/v1/health/live
```

### Adding New Checks

To add a new health check:

1. Create a check function in `controllers.ts`:
```typescript
async function checkNewService(): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    // Perform check
    const responseTime = Date.now() - startTime;
    return {
      status: 'pass',
      responseTime,
      message: 'Service healthy',
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Service check failed',
      details: { error: error.message },
    };
  }
}
```

2. Add it to `getDetailedHealth`:
```typescript
const newServiceCheck = await checkNewService();

const health: DetailedHealthStatus = {
  // ...
  checks: {
    database: dbCheck,
    redis: redisCheck,
    memory: memoryCheck,
    newService: newServiceCheck, // Add here
  },
};
```

---

## Related Files

- `apps/main-backend/src/api/health/controllers.ts` - Health check logic
- `apps/main-backend/src/api/health/routes.ts` - Health routes configuration
- `apps/main-backend/src/api/index.ts` - Main API router registration
