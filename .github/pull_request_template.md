# Pull Request Template

## Summary
Describe the change. Link the primary issue(s):
- Closes #

## Type of Change
- [ ] Feature
- [ ] Security Hardening
- [ ] Bug Fix
- [ ] Refactor
- [ ] Documentation
- [ ] Other

## Description
Explain rationale, architecture decisions, and any deviations from the design documents.

## Security & Compliance Checklist
(Leave checked only if applicable & completed)
- [ ] No plaintext secrets introduced
- [ ] Uses centralized secret manager (if secrets needed)
- [ ] Input validation / sanitization applied
- [ ] Auth required for all new endpoints
- [ ] Authorization (role/department) enforced server-side
- [ ] Added/updated audit logging where needed
- [ ] CSRF considerations covered (if state-changing + cookies)
- [ ] XSS vectors reviewed (no unsafe innerHTML without sanitize)
- [ ] CSP still passes (no new inline scripts)
- [ ] Sensitive data not logged
- [ ] Added/updated unit tests (≥ coverage for new logic)
- [ ] Performance impact analyzed (P95 latency not regressed)
- [ ] Accessibility (ARIA / contrast) considered (UI changes)
- [ ] Internationalization/RTL respected (UI changes)

## Database / Migration
- [ ] New migrations generated & tested locally
- [ ] Backward-compatible (deploy safe)
- [ ] Rollback strategy documented

## Testing Evidence
Provide summaries or attach logs/screens:
- Unit Tests:
- Integration Tests:
- Manual Validation Steps:

## Risks / Mitigations
List potential risks and how mitigated.

## Deployment Notes
Anything special? (order of operations, feature flags, config changes)

## Screenshots / Diagrams (if UI or flows)
_(Optional)_

## Follow-Ups
Future tasks, technical debt, or postponed items.
