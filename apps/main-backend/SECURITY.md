# Security Hardening - FundifyHub Main Backend

This document outlines the security measures implemented in the FundifyHub main backend service.

## Overview

The security hardening implementation follows industry best practices and protects against common web vulnerabilities including:
- NoSQL Injection
- Cross-Site Scripting (XSS)
- HTTP Parameter Pollution (HPP)
- Information Disclosure
- DDoS attacks (via rate limiting)

---

## Security Middleware Stack

The security middleware is applied in the following order in `server.ts`:

### 1. Helmet - Security Headers
**Purpose:** Sets various HTTP headers to protect against well-known vulnerabilities

**Configuration:**
```typescript
helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
})
```

**Features:**
- ✅ Content Security Policy (CSP) in production
- ✅ X-Frame-Options (clickjacking protection)
- ✅ X-Content-Type-Options (MIME sniffing protection)
- ✅ X-XSS-Protection
- ✅ Strict-Transport-Security (HSTS)
- ✅ Referrer-Policy

---

### 2. NoSQL Injection Prevention
**Package:** `express-mongo-sanitize`

**Purpose:** Removes prohibited characters from request data to prevent NoSQL query injection

**Configuration:**
```typescript
mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`NoSQL injection attempt detected from ${req.ip}`, { 
      key, 
      path: req.path 
    });
  },
})
```

**Features:**
- ✅ Removes `$` and `.` from request data
- ✅ Logs injection attempts with IP tracking
- ✅ Replaces malicious characters with `_`

**Example Protection:**
```javascript
// Malicious input
{ "username": { "$gt": "" }, "password": { "$gt": "" } }

// Sanitized output
{ "username": { "_gt": "" }, "password": { "_gt": "" } }
```

---

### 3. XSS Protection
**Package:** `xss-clean`

**Purpose:** Sanitizes user input to prevent Cross-Site Scripting attacks

**Configuration:**
```typescript
xss()
```

**Features:**
- ✅ Removes malicious HTML/JavaScript from request data
- ✅ Protects against reflected XSS
- ✅ Protects against stored XSS

**Example Protection:**
```javascript
// Malicious input
{ "comment": "<script>alert('XSS')</script>" }

// Sanitized output
{ "comment": "&lt;script&gt;alert('XSS')&lt;/script&gt;" }
```

---

### 4. HTTP Parameter Pollution Prevention
**Package:** `hpp`

**Purpose:** Protects against HTTP Parameter Pollution attacks

**Configuration:**
```typescript
hpp({
  whitelist: ['sort', 'filter', 'page', 'limit'],
})
```

**Features:**
- ✅ Prevents duplicate parameters
- ✅ Whitelist for legitimate array parameters
- ✅ Protects against query string manipulation

**Example Protection:**
```javascript
// Malicious query
?amount=10&amount=9999

// Result: Only last value is used
amount = 9999

// With HPP: First value is used
amount = 10
```

---

### 5. Response Compression
**Package:** `compression`

**Purpose:** Reduces response size for better performance

**Configuration:**
```typescript
compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
})
```

**Features:**
- ✅ Gzip compression for responses
- ✅ Configurable compression level (6 = balanced)
- ✅ Option to disable per-request
- ✅ Automatic content-type detection

**Benefits:**
- Reduces bandwidth usage by 60-80%
- Faster response times
- Lower server costs

---

### 6. CORS Configuration
**Purpose:** Controls which origins can access the API

**Configuration:**
```typescript
cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
})
```

**Features:**
- ✅ Whitelist of allowed origins
- ✅ Credentials support for authenticated requests
- ✅ Automatic rejection of unauthorized origins

**Allowed Origins:**
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://192.168.29.97:3000` (LAN development)

---

### 7. Rate Limiting
**Location:** `apps/main-backend/src/utils/rate-limit.ts`

**Purpose:** Protects against brute force and DDoS attacks

**Configuration:**
```typescript
Route-specific limits:
- AUTH: 10 requests / 15 minutes
- OTP: 3 requests / minute
- PAYMENT: 20 requests / minute
- UPLOAD: 10 requests / minute
- ADMIN: 200 requests / minute
- GENERAL: 100 requests / minute
```

**Features:**
- ✅ Sliding window algorithm
- ✅ Redis-backed for distributed systems
- ✅ Per-IP and per-user limiting
- ✅ Rate limit headers in response
- ✅ Automatic retry-after headers

---

### 8. Request Size Limits

**Purpose:** Prevents large payload attacks

**Configuration:**
```typescript
express.json({ limit: '10mb' })
express.urlencoded({ extended: true })
```

**Features:**
- ✅ 10MB max request body size
- ✅ Protects against memory exhaustion
- ✅ Automatic rejection of oversized requests

---

## Additional Security Measures

### Proxy Trust Configuration
```typescript
app.set('trust proxy', 1);
```
- Enables accurate IP detection behind proxies
- Required for rate limiting and logging
- Supports Load Balancers and CDNs

### SQL Injection Prevention
- ✅ **Prisma ORM** handles parameterized queries automatically
- ✅ No raw SQL queries allowed
- ✅ Type-safe database access

### Password Security
- ✅ **bcrypt** hashing (configured in `utils/config.ts`)
- ✅ Configurable rounds (default: 10)
- ✅ Automatic salt generation

---

## Security Headers Reference

### Content-Security-Policy (Production Only)
```
default-src 'self';
style-src 'self' 'unsafe-inline';
script-src 'self';
img-src 'self' data: https:;
```

### Other Headers (via Helmet)
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=15552000; includeSubDomains
Referrer-Policy: no-referrer
```

---

## Testing Security

### Testing NoSQL Injection
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": {"$gt": ""}, "password": {"$gt": ""}}'
```
**Expected:** 400 Bad Request, injection attempt logged

### Testing XSS
```bash
curl -X POST http://localhost:3001/api/v1/some-endpoint \
  -H "Content-Type: application/json" \
  -d '{"comment": "<script>alert(1)</script>"}'
```
**Expected:** Script tags sanitized

### Testing HPP
```bash
curl "http://localhost:3001/api/v1/some-endpoint?amount=10&amount=9999"
```
**Expected:** Only first value used

### Testing Rate Limiting
```bash
for i in {1..15}; do
  curl http://localhost:3001/api/v1/auth/login
done
```
**Expected:** 429 Too Many Requests after 10 attempts

---

## Security Checklist

### Implemented ✅
- [x] NoSQL injection prevention
- [x] XSS protection
- [x] HPP prevention
- [x] CORS configuration
- [x] Security headers (Helmet)
- [x] Content Security Policy
- [x] Rate limiting
- [x] Request size limits
- [x] Response compression
- [x] Password hashing
- [x] SQL injection prevention (Prisma)
- [x] Proxy trust configuration

### Pending
- [ ] CSRF protection for state-changing operations
- [ ] JWT token rotation
- [ ] Session invalidation on password change
- [ ] Secure cookie settings
- [ ] API key authentication for webhooks
- [ ] Error tracking service (Sentry/Bugsnag)

---

## Best Practices

### For Developers

1. **Never trust user input** - Always validate and sanitize
2. **Use environment-specific CSP** - Strict in production, relaxed in development
3. **Log security events** - Monitor injection attempts and suspicious activity
4. **Keep dependencies updated** - Regularly update security packages
5. **Use HTTPS in production** - Never send sensitive data over HTTP
6. **Implement the principle of least privilege** - Minimum permissions for all operations

### For DevOps

1. **Enable HTTPS/TLS** - Use Let's Encrypt or similar
2. **Configure reverse proxy** - Nginx or similar with additional security rules
3. **Monitor security logs** - Set up alerts for injection attempts
4. **Regular security audits** - Use tools like `npm audit`
5. **WAF (Web Application Firewall)** - Consider Cloudflare or AWS WAF
6. **Backup regularly** - Prepare for worst-case scenarios

---

## Monitoring

### Security Events to Monitor

1. **NoSQL Injection Attempts**
   - Log level: WARN
   - Contains: IP address, attempted payload
   
2. **Rate Limit Violations**
   - Log level: WARN
   - Contains: IP/User, endpoint, attempt count

3. **CORS Violations**
   - Log level: ERROR
   - Contains: Origin, requested resource

4. **Malformed Requests**
   - Log level: INFO
   - Contains: Request details, validation errors

### Metrics to Track

- Request rate by endpoint
- Error rate by type
- Security event frequency
- Rate limit hit rate
- Response times

---

## Related Files

- `apps/main-backend/src/server.ts` - Security middleware configuration
- `apps/main-backend/src/utils/rate-limit.ts` - Rate limiting implementation
- `apps/main-backend/src/utils/config.ts` - Security configuration
- `apps/main-backend/src/utils/error-handler.ts` - Error handling
- `apps/main-backend/src/types/xss-clean.d.ts` - Type declarations

---

*Last Updated: December 4, 2025*
*Phase 7: Platform Hardening - Session 2*
