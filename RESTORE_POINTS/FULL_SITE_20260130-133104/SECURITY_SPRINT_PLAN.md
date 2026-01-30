# Security Improvement Sprint Plan (4 Weeks)

## Overview
Objective: Establish foundational security (identity, authorization, transport), then governance & hardening, followed by observability enhancements and advanced protections.
Cadence: 4 Weeks (1 Sprint) – Weekly milestones with explicit exit criteria.
Assumption: Team size 2–3 engineers + 1 reviewer.

## Week 1: Foundational Data & Authentication
Focus: Data layer centralization + secure credential handling.
Planned Issues: #1, #2, partial #3, #5 (HTTPS), #20 (ID generation)
Deliverables:
- Database schema migrated & operational (Tickets, Employees, Departments minimal).
- Password hashing live; legacy plaintext purged.
- Session/JWT scaffold implemented (login, logout, protected route check).
- HTTPS redirection active in staging.
- Server-side ticket ID generation endpoint working.
Exit Criteria:
- All CRUD tests pass (Tickets & Employees).
- No production credentials in localStorage for auth.
- Lint/Type build clean.
- Basic load test (50 rps 1m) with < 2% error rate.
 - `npm run db:generate` then `npm run db:init` executed successfully in dev.
Risks/Mitigations:
- Schema churn → Mitigate via migration scripts.
- Downtime risk → Schedule maintenance window.
 - Migration failure → Dry-run on staging SQLite file before production target.

## Week 2: Authorization & Governance
Focus: Enforce least-privilege & traceability.
Planned Issues: #3 (complete), #4, #6, #8, #9, #11 (scaffold)
Deliverables:
- Authorization middleware guarding protected endpoints.
- Rate limiting for login attempts.
- Audit logging table with entries for auth & ticket mutations.
- CSRF protection enabled (if cookie sessions).
- Initial RBAC role definitions stored.
Exit Criteria:
- 90%+ unit test coverage of allow/deny matrix.
- Simulated brute-force blocked by rate limiter.
- Audit logs visible via internal admin endpoint.
- CSRF test harness attack fails.
Risks/Mitigations:
- Overblocking legitimate users → Use feature flag to disable temporarily.

## Week 3: Browser & Data Protection Hardening
Focus: Frontend exploit reduction + protection of retained data.
Planned Issues: #7, #14, #13, #12 (vault integration), #18 (design phase), #10 (MFA groundwork)
Deliverables:
- CSP report-only → enforced by mid-week.
- High-risk fields encoded/sanitized, SRI on external scripts.
- Data retention policy doc & archival job stub.
- Secret manager integration for runtime secrets.
- MFA enrollment flow ready (without enforcement toggle ON by default).
Exit Criteria:
- No CSP violations (critical) after enforcement window (24h sample).
- Pen-test XSS payloads neutralized.
- Secrets not present in plain `process.env` dumps.
- MFA flow completes for admin test user.
Risks/Mitigations:
- CSP breakage → staged rollout with monitoring.

## Week 4: Advanced Observability & Extended Controls
Focus: Behavioral detection, SIEM integration, SDLC gating, key governance.
Planned Issues: #15, #16, #17, #19, finalize #18 & #11, start #10 enforcement.
Deliverables:
- Anomaly detection job computing activity metrics.
- Log shipping to SIEM with base dashboards.
- CI pipeline blocking critical SAST findings.
- Draft encryption at-rest prototype for attachments.
- Key rotation procedure documented & dry-run executed.
Exit Criteria:
- SIEM dashboards show live data (errors, auth events).
- SAST pipeline fails intentionally injected critical issue.
- Anomaly alert triggers on synthetic abnormal pattern.
- Rotation log entry created successfully.
Risks/Mitigations:
- Noise in anomaly detection → adjustable thresholds.

## Backlog / Stretch
- Full WebAuthn adoption (#10 advanced path)
- Hash chaining for audit immutability (extend #8)
- Hash-based integrity signatures for ticket snapshots

## Roles & Responsibilities
| Role | Responsibility |
|------|---------------|
| Lead Engineer | Architectural decisions, DB schema review |
| Security Engineer | CSP, XSS hardening, rate limiting tuning |
| Backend Engineer | Auth, authorization, audit logging |
| DevOps | HTTPS, secret management, CI security gates |

## Tooling & Environments
- Dev: Hot reload, debug flags enabled.
- Staging: CSP report-only, audit log sampling.
- Prod: All controls enforced, MFA optional toggle.

## Metrics (Weekly Tracking)
| Metric | Target |
|--------|--------|
| P95 Latency (Auth) | < 300ms |
| Auth Fail / Success Ratio | < 0.25 (legitimate) |
| Missing Audit Events | 0 critical gaps |
| CSP Violations (post-enforce) | 0 high severity |
| SAST Critical Findings | 0 open > 48h |

## Exit Summary (Sprint Completion)
Sprint considered successful when:
1. Core trust boundary moved server-side (identity, authorization).
2. Browser risk surface measurably reduced (CSP + XSS hardening).
3. Governance pillars present (audit, retention policy draft).
4. Secure SDLC controls operational (SAST gate).
5. Foundation laid for advanced detection (anomaly metrics collected).

## Post-Sprint Recommendations
- Plan Phase 2: Full encryption rollout, WebAuthn enforcement, anomaly tuning iteration.
- Schedule external penetration test once Phase 1 controls stable.
