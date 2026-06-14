# Vora Operational Playbook & Launch Choreography Guide

This playbook details the deployment sequences, cryptographic lock states, fallback protocols, and DNS propagation configurations for the Vora virtual event platform.

---

## 1. Automated Defcon Lockdown Protocol

### Triggering a Lockdown
In the event of active penetration attempts or JWT compromise, administrative sessions can lock down the platform:
1. Access the API gateway with Admin credentials.
2. Invoke `POST /api/v1/security/lockdown` to revoke all active tokens.
3. This triggers a global revocation check in `authMiddleware.js`. All requests from standard users will fail with a `401 Unauthorized` response.

### Recovery Vector
To restore the platform to a nominal state:
1. Resolve the vector or complete database maintenance.
2. Invoke `POST /api/v1/security/lockdown/reset` with cryptographic Admin key override.
3. Standard user sessions can log in again.

---

## 2. Zero-Downtime Rollback Strategy

Our PaaS deployment (Render / Heroku) uses immutable container versions. If an emergency issue is detected post-deployment:
1. **Trigger Rollback**: In the control center, select the prior stable container build digest.
2. **Traffic Re-routing**: The proxy load balancer will switch incoming HTTP/WS traffic to the prior container instances.
3. **Database Guardrails**: Since table structures are non-destructive (column drops are disallowed in intermediate releases), database migrations remain backward-compatible, ensuring zero data loss during rollbacks.

---

## 3. Pre-Flight Cache Warming Protocol

To prevent first-visit performance penalties due to cold CDN caches, execute the cache warming script prior to flipping traffic:
1. Run the cache warmer targeting global edge nodes:
   ```powershell
   node vora-backend/src/scripts/cacheWarmer.js
   ```
2. This script issues parallel HEAD and GET requests across key landing pages and explore routes, caching compressed static bundles on edge nodes globally.

---

## 4. Zero-Hour DNS Propagation

Flipping the primary master domain over to the production delivery networks:
1. **Reduce TTL**: Set Time-To-Live (TTL) on DNS records (`vora.com`) to `60 seconds` 4 hours prior to launch.
2. **DNS CNAME Update**: Point the master record CNAME to the edge delivery network distribution (e.g. `vora.cloudflare.net` or Vercel CNAME).
3. **Reset TTL**: Once propagation checks verify global routing changes, reset the TTL to standard values (`3600 seconds`) to stabilize resolution times.
