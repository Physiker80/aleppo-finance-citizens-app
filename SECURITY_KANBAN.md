# Security Hardening Kanban & Timeline Mapping

Legend:
- Column = Current workflow stage
- Week reference aligns with 0–8 week roadmap (see security reports)
- Status tags: `PLANNED`, `IN_PROGRESS`, `BLOCKED`, `DONE`, `DEFERRED`

## 1. Kanban Board (Markdown)

### Backlog
| ID | Title | Priority | Planned Week | Status | Notes |
|----|-------|----------|--------------|--------|-------|
| 12 | Central Secrets Management (Vault) | Medium | 6+ | PLANNED | After DB solidification |
| 15 | Anomaly Behavior Detection | Low | Post 8 | PLANNED | Needs full audit coverage |
| 16 | SIEM Integration (Elastic/Wazuh) | Low | Post 8 | PLANNED | Dependent on expanded logging |
| 17 | SAST/DAST in CI Pipeline | Low | Post 8 | PLANNED | After baseline stabilization |
| 18 | At-Rest Encryption (Attachments/Data) | Medium | Post 8 | PLANNED | Requires storage abstraction |
| 19 | Key / Secret Rotation Policy | Low | Post 8 | PLANNED | Needs Vault adoption |
| 20 | Server-Side Ticket ID Generation | Medium | 2–3 | PLANNED | After DB migration |
| 25 | AI-Powered Data Classification | Medium | Post 8 | PLANNED | Enhance automatic data classification |

### In Progress
| ID | Title | Priority | Week | Status | Notes |
|----|-------|----------|------|--------|-------|
| 1 | Central Database Migration | Critical | 1–2 | IN_PROGRESS | Schema design & migration scripts |
| 2 | Password Hashing & Identity Move | Critical | 1–2 | IN_PROGRESS | Depends on Issue #1 tables |

### Ready (Next Up)
| ID | Title | Priority | Target Week | Status | Notes |
|----|-------|----------|-------------|--------|-------|
| 22 | Deploy Data Authorization Across System | High | 1 | PLANNED | Extend ABAC to all employee pages |
| 3 | Secure Sessions (HTTPOnly / Rotation) | Critical | 1–2 | PLANNED | Fast-follow after DB + hashing |
| 5 | Enforce HTTPS + HSTS | Critical | 1 | PLANNED | Can deploy in parallel |
| 6 | Login Attempt Rate Limiting | High | 6 | PLANNED | Could pull earlier if easy |
| 10 | Admin MFA (TOTP / WebAuthn) | High | 8 | PLANNED | After stable auth layer |
| 13 | Data Retention & Archiving Policy | Medium | 8 | PLANNED | Needs audit log maturity |

### Implementation Queue
| ID | Title | Priority | Week | Status | Notes |
|----|-------|----------|------|--------|-------|
| 4 | Server-Side Authorization Middleware | Critical | 3 | PLANNED | Role + department + forwarded checks |
| 23 | Server-Side ABAC Integration | High | 3–4 | PLANNED | Integrate data-level auth with server middleware |
| 7 | Content Security Policy (CSP) | High | 5 | PLANNED | Report-Only → Enforce |
| 8 | Comprehensive Audit Logging | High | 4 | PLANNED | Hash chain generalization |
| 24 | Sensitive Data Encryption | High | 5–6 | PLANNED | Encrypt classified data at rest |
| 9 | CSRF Protection | High | 7 | PLANNED | After cookies canonical |
| 11 | Flexible RBAC (Expanded Roles) | Medium | 7 | PLANNED | Auditor / Viewer roles |
| 14 | XSS Hardening (Encoding + SRI) | Medium | 5 | PLANNED | Aligned with CSP rollout |

### Done
| ID | Title | Priority | Week | Status | Notes |
|----|-------|----------|------|--------|-------|
| 21 | Data-Level Authorization System (ABAC) | Critical | Completed | DONE | ✅ Comprehensive ABAC with 4 classification levels, audit trails, secure UI |

## 2. Timeline Alignment (0–8 Weeks)
| Week | Primary Goal | Issues Anchored |
|------|--------------|-----------------|
| 1 | Data Auth Deployment + HTTPS/HSTS | 22,5 |
| 1–2 | DB + Password Hashing + Sessions bootstrap | 1,2,3 |
| 3 | Authorization Middleware (Dept + Role) | 4,20 |
| 3–4 | Server-Side ABAC Integration | 23 |
| 4 | Audit Generalization + Stability | 8 |
| 5 | CSP + XSS Hardening | 7,14 |
| 5–6 | Sensitive Data Encryption | 24 |
| 6 | Login Attempt Rate Limits | 6 |
| 7 | CSRF + RBAC Expansion | 9,11 |
| 8 | MFA + Archiving / Retention | 10,13 |
| Post 8 | Advanced Security & Analytics | 12,15,16,17,18,19,25 |

## 3. Progress Metrics (Updated)
| Metric | Current | Target (Week 8) |
|--------|---------|-----------------|
| **Data-Level Authorization coverage** | 25% | ≥95% |
| Critical Auth/Data Issues Closed (#1–#5,21) | 1 | 6 |
| **Sensitive data access control** | 85% | ≥98% |
| Full Audit Coverage (%) | ~60% | ≥95% |
| Plaintext Password Records | Present | 0 |
| Client-Side Only Authorization (%) | 45% | <5% |
| MFA Enabled for Admin | No | Yes |
| CSP Enforced | No | Yes |

## 4. Recent Achievements
### ✅ Completed (September 2025)
- **Data-Level Authorization System**: Comprehensive ABAC implementation with:
  - 4 security classification levels (Public, Internal, Confidential, Highly Confidential)
  - 5 resource types with dedicated access rules
  - Automatic data classification based on content analysis
  - Comprehensive audit trail with detailed access logging
  - Smart user interface with permission visualization
  - Developer-friendly React hooks and integration utilities

## 4. Update Process
- Update this board weekly (end of each sprint week) with:
  - Status transitions (e.g., PLANNED → IN_PROGRESS → DONE)
  - Notes reflecting blockers or dependency shifts
  - Adjusted target weeks if scope changes
- Link commits to Issue IDs in messages (e.g., `feat(auth): implement hashing (Issue #2)`).

## 5. Governance & Review Cadence
| Meeting | Frequency | Focus |
|---------|-----------|-------|
| Security Sync | Weekly | Status deltas, blockers, re-prioritization |
| Architecture Review | Bi-weekly | Design adjustments, risk acceptance |
| Incident Simulation (Tabletop) | Quarterly | Response readiness |

---
Generated automatically; adjust priorities if new critical risks emerge.
