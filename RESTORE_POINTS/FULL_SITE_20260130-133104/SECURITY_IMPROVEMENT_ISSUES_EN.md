# Security & Architecture Improvement Issues (English Pack)

## Quick Index
| # | Title | Priority | Type | Effort | Dependencies |
|---|-------|----------|------|--------|--------------|
| 1 | Adopt Central Database | Critical | Data Architecture | High | None |
| 2 | Password Hashing & Identity Migration | Critical | Identity | Medium | 1 |
| 3 | Secure Session / JWT Layer | Critical | Authentication | Medium | 2 |
| 4 | Server-side Authorization Middleware | Critical | Authorization | Medium | 3 |
| 5 | Enforce HTTPS + HSTS | Critical | Transport Security | Low | None |
| 6 | Login Attempt Rate Limiting | High | Identity Protection | Low | 3 |
| 7 | Baseline Strict Content Security Policy | High | Browser Security | Medium | 5 |
| 8 | Audit Logging Subsystem | High | Governance | Medium | 1,4 |
| 9 | CSRF Protection (if Cookies) | High | Application | Low | 3 |
|10 | Admin MFA (TOTP/WebAuthn) | High | Identity | Medium | 2,3 |
|11 | Flexible RBAC Model | Medium | Authorization | Medium | 4 |
|12 | Centralized Secret Management (Vault) | Medium | Infrastructure | Medium | 1 |
|13 | Data Retention & Archiving Policy | Medium | Compliance | Medium | 1,8 |
|14 | XSS Hardening (Encoding + SRI) | Medium | Browser Security | Medium | 7 |
|15 | Behavioral Anomaly Detection | Low | Advanced Observability | High | 1,8 |
|16 | SIEM Integration (Elastic/Wazuh) | Low | Monitoring | High | 8 |
|17 | CI SAST/DAST Security Gates | Low | Secure SDLC | Medium | 1,5 |
|18 | At-Rest Encryption (Sensitive + Attachments) | Medium | Data Protection | High | 1,12 |
|19 | Key & Secret Rotation Policy | Low | Governance | Medium | 12 |
|20 | Server-Side Ticket ID Generation | Medium | Data Integrity | Low | 1 |

---
## Detailed Issues

### Issue 1: Adopt Central Database
Category: Data Architecture / Core
Description: Migrate from browser localStorage to a server-managed relational database (PostgreSQL preferred). Define normalized schema (Employees, Tickets, Departments, Notifications, AuditLogs, Attachments).
Rationale: Eliminate client-side tampering risk, enable multi-user sync, allow backups and integrity constraints.
Acceptance Criteria:
1. ERD draft documented.
2. CRUD REST endpoints for Tickets operational with integration tests.
3. No critical domain object persists only in localStorage.
4. Indexes on (status, department, createdAt) proven in query plan.
Effort: High.
Risk if Deferred: Continued integrity & trust issues.
Dependencies: None.
Notes: Use migration tool (Prisma / Knex). Use UTC timestamps.

### Issue 2: Password Hashing & Identity Migration
Category: Identity
Description: Move employee credentials to DB with hashed passwords (Argon2id or bcrypt cost >=12) storing fields (username, password_hash, role, department, created_at, last_login_at, is_active).
Rationale: Remove plaintext credential exposure, align with security baselines.
Acceptance Criteria:
1. No plaintext password storage remains.
2. hashPassword() + verifyPassword() wrappers with unit tests.
3. Hash parameters documented (memory/time/parallelism or cost).
4. Successful login updates last_login_at.
5. Failed login does not reveal existence of user.
Effort: Medium.
Risk if Deferred: Credential leakage & reuse exploitation.
Dependencies: 1.

### Issue 3: Secure Session / JWT Layer
Category: Authentication
Description: Implement server-issued session cookie (HttpOnly, Secure, SameSite=Strict) OR short-lived JWT (≤30m) plus refresh flow (≤8h) with rotation.
Rationale: Prevent token theft via XSS and enforce session expiration.
Acceptance Criteria:
1. Authenticated route rejects absent/expired tokens.
2. Refresh rotation invalidates prior refresh token.
3. Logout revokes session immediately.
4. Automated test covers access → expiry → refresh → renewed access.
5. Token secrets stored via secret manager (not in repo).
Effort: Medium.
Risk if Deferred: Long-lived hijackable sessions.
Dependencies: 2.

### Issue 4: Server-side Authorization Middleware
Category: Authorization
Description: Central middleware enforcing role + department constraints for CRUD operations.
Rationale: Remove trust in client role claims.
Acceptance Criteria:
1. Non-admin cannot access other department tickets unless forwarded.
2. Admin unrestricted (subject to audit logging).
3. 403 responses logged with contextual metadata.
4. Unit tests for allow/deny matrix.
Effort: Medium.
Risk if Deferred: Cross-department data exposure.
Dependencies: 3.

### Issue 5: Enforce HTTPS + HSTS
Category: Transport Security
Description: Redirect all HTTP to HTTPS and send HSTS (>=180 days) in production.
Rationale: Mitigate MITM and downgrade attacks.
Acceptance Criteria:
1. 301 redirect from HTTP root.
2. Strict-Transport-Security header present.
3. SSL scan rating ≥ A.
4. No mixed-content warnings.
Effort: Low.
Risk if Deferred: Credential/session interception.
Dependencies: None.

### Issue 6: Login Attempt Rate Limiting
Category: Identity Protection
Description: Per (IP, username) attempt counters with exponential backoff or lock window (e.g., 5 attempts / 15m).
Rationale: Throttle brute-force attacks.
Acceptance Criteria:
1. Exceeding limit returns 429 or structured error.
2. Counter resets on successful login.
3. Limit parameters configurable via env.
4. Events recorded in audit log.
Effort: Low.
Risk if Deferred: Easier password guessing.
Dependencies: 3.

### Issue 7: Baseline Strict CSP
Category: Browser Security
Description: Deploy CSP minimizing script origins (self + nonced/hashes) and forbidding unsafe-inline except transitional report-only stage.
Rationale: Reduce XSS injection vectors.
Acceptance Criteria:
1. Report-Only stage collects violations for ≥7 days.
2. Enforced CSP without functional regression.
3. Inline scripts replaced or nonced.
4. Documented exceptions.
Effort: Medium.
Risk if Deferred: Elevated XSS exposure.
Dependencies: 5.

### Issue 8: Audit Logging Subsystem
Category: Governance
Description: Append-only audit table capturing (actor, action, entity, entity_id, before, after, ip, user_agent, timestamp) with optional hash chain.
Rationale: Forensics, accountability, regulatory support.
Acceptance Criteria:
1. Logs for login success/fail, ticket CRUD, permission denials.
2. Export endpoint (CSV) with time filter.
3. Hash chaining or immutable append semantics.
4. Unit test ensures log write on ticket update.
Effort: Medium.
Risk if Deferred: Weak incident investigation.
Dependencies: 1,4.

### Issue 9: CSRF Protection
Category: Application Security
Description: Synchronizer or double-submit tokens for state-changing requests (if cookie-based auth).
Rationale: Prevent cross-site request forgery.
Acceptance Criteria:
1. All POST/PUT/DELETE require valid CSRF token.
2. Token rotates on logout.
3. Automated test simulating CSRF attack fails.
4. Clear integration docs for frontend.
Effort: Low.
Risk if Deferred: Unauthorized state changes.
Dependencies: 3.

### Issue 10: Admin MFA (TOTP/WebAuthn)
Category: Identity
Description: Add second factor for privileged accounts using TOTP or WebAuthn.
Rationale: Reduce impact of password compromise.
Acceptance Criteria:
1. Enrollment flow with QR (TOTP) or device registration (WebAuthn).
2. Backup recovery codes (≥5) hashed/secured.
3. MFA required before session issuance.
4. Ability to revoke factor with audit entry.
Effort: Medium.
Risk if Deferred: Higher privilege compromise likelihood.
Dependencies: 2,3.

### Issue 11: Flexible RBAC Model
Category: Authorization
Description: Roles + permissions matrix (admin, department_user, auditor, viewer, support, etc.) with centralized `can(user, action, resource)` helper.
Rationale: Principle of least privilege.
Acceptance Criteria:
1. Roles & permissions tables.
2. Deny path returns consistent 403 schema.
3. 90%+ coverage of permission decision branches.
4. Admin bypass flagged in audit entries.
Effort: Medium.
Risk if Deferred: Over-privileged accounts.
Dependencies: 4.

### Issue 12: Centralized Secret Management
Category: Infrastructure
Description: Move secrets (email creds, API keys) into Vault / cloud secret manager, removing hard-coded or env-file only reliance.
Rationale: Reduce leakage risk & enable rotation.
Acceptance Criteria:
1. No plain secrets in repo or build logs.
2. Startup fails fast if secret missing.
3. Document rotation procedure.
4. Access control (authn/authz) on secret retrieval.
Effort: Medium.
Risk if Deferred: Secret sprawl & exposure.
Dependencies: 1.

### Issue 13: Data Retention & Archiving
Category: Compliance
Description: Define retention windows (tickets, logs, attachments) and scheduled archival into separate tables/storage.
Rationale: Control storage growth & legal compliance.
Acceptance Criteria:
1. Scheduled job archives eligible records.
2. Archived data is read-only.
3. Policy doc specifying durations.
4. Retrieval process documented.
Effort: Medium.
Risk if Deferred: Storage bloat & compliance gaps.
Dependencies: 1,8.

### Issue 14: XSS Hardening (Encoding + SRI)
Category: Browser Security
Description: Output encoding of all user-driven fields + Subresource Integrity for external scripts (or local bundling).
Rationale: Defense-in-depth for injection.
Acceptance Criteria:
1. No unsafe `dangerouslySetInnerHTML` without sanitize wrapper.
2. XSS test payload rendered inert.
3. All third-party scripts have SRI or are self-hosted.
4. Documented high-risk fields and mitigation list.
Effort: Medium.
Risk if Deferred: Persisted or reflected XSS.
Dependencies: 7.

### Issue 15: Behavioral Anomaly Detection
Category: Advanced Observability
Description: Collect per-user behavior metrics (tickets viewed/hour, updates/hour) and flag deviations (Z-score or threshold-based).
Rationale: Early insider threat detection.
Acceptance Criteria:
1. Daily rollup metrics persisted.
2. Alert generated on threshold breach.
3. Admin dashboard shows top anomalies.
4. Correlation link to audit entries.
Effort: High.
Risk if Deferred: Slow detection of misuse.
Dependencies: 1,8.

### Issue 16: SIEM Integration
Category: Monitoring
Description: Forward structured logs (access, audit, security events) to Elastic/Wazuh or comparable SIEM with dashboards & alert rules.
Rationale: Central visibility & correlation.
Acceptance Criteria:
1. TLS-protected log shipping.
2. Dashboards: top errors, failed logins, permission denials.
3. Alert triggers email/webhook for critical thresholds.
Effort: High.
Risk if Deferred: Fragmented visibility.
Dependencies: 8.

### Issue 17: CI SAST/DAST Security Gates
Category: Secure SDLC
Description: Integrate static (Semgrep/Snyk) + dynamic (OWASP ZAP) scanning into CI pipeline.
Rationale: Shift-left vulnerability detection.
Acceptance Criteria:
1. Build fails on critical severity findings.
2. Reports retained (≥30 days).
3. Document triage & remediation workflow.
Effort: Medium.
Risk if Deferred: Latent vulnerabilities shipping.
Dependencies: 1,5.

### Issue 18: At-Rest Encryption
Category: Data Protection
Description: Encrypt sensitive ticket fields and attachments using a data encryption key (rotatable) protected by a master key.
Rationale: Protect confidentiality if storage compromised.
Acceptance Criteria:
1. Field/attachment encryption transparent to app logic.
2. Semi-annual DEK rotation procedure tested.
3. Failed decrypt never exposes plaintext.
Effort: High.
Risk if Deferred: Direct data exposure.
Dependencies: 1,12.

### Issue 19: Key & Secret Rotation Policy
Category: Governance
Description: Scheduled rotation cadence + automation for critical secrets and keys.
Rationale: Limit lifetime of compromised secrets.
Acceptance Criteria:
1. Rotation log with timestamps & actor.
2. Pre-expiry alerting.
3. Zero-downtime rotation test.
Effort: Medium.
Risk if Deferred: Prolonged secret exposure window.
Dependencies: 12.

### Issue 20: Server-Side Ticket ID Generation
Category: Data Integrity
Description: Move ID generation logic to backend ensuring atomic sequence + collision-free daily pattern.
Rationale: Prevent manual tampering and collisions.
Acceptance Criteria:
1. POST /tickets ignores client-sent ID.
2. Concurrency test (1000 parallel creates) passes with unique IDs.
3. Configurable prefix/pattern via server config only.
Effort: Low.
Risk if Deferred: Potential ID spoofing or duplication.
Dependencies: 1.

---
## General Execution Notes
- Use UTC across all timestamps.
- Reference issue numbers in commit messages (e.g., `feat(db): add tickets table (#1)`).
- Apply labels: `security`, `architecture`, `compliance`, `observability`.

## Suggested Initial Batch
Start with issues 1 → 6 to establish core trust foundations before layering advanced controls.

## Closure
This English pack mirrors the Arabic source with equivalent acceptance rigor, enabling bilingual tracking and governance.
