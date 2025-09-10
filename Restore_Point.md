# Restore Points

This file contains information about the restore points created for the project.

## Available Restore Points

To list all available restore points, use the following command in your terminal:

```bash
git tag
```

## How to Restore

If you need to revert the project to a specific restore point, use the following command. Replace `<tag_name>` with the desired restore point from the list.

```bash
git checkout <tag_name>
```

### Example

To restore to the initial point created on September 6, 2025:

```bash
git checkout restore-point-2025-09-06_06-27-46
```

## New Suggested Restore Point

Create a tag for the current stable state (after centering submission time and standardizing pdf.js workers):

```bash
git add .
git commit -m "feat: center submission time block & unify pdf.js workerPort usage"
git tag restore-point-2025-09-10_$(Get-Date -Format HH-mm-ss)
git push origin --tags
```

If using plain POSIX shell:

```bash
git tag "restore-point-2025-09-10_$(date +%H-%M-%S)"
```

## Logged Restore Point (2025-09-10)

Created tag:

```
restore-20250910-200300
```

Contents include:
- Admin monitoring page (`#/monitor`).
- AI-style heuristic analysis card.
- pdf.js worker unification.
- Confirmation page layout (centered submission time block).
- Tracking page robust decode & fixed proxy file.

To restore to this exact snapshot later:

```bash
git checkout restore-20250910-200300
```

To push the tag to remote:

```bash
git push origin restore-20250910-200300
```

## Latest Restore Point (2025-09-10 21:00)

Created tag:

```
restore-20250910-210000
```

Contents include:
- Complete monitoring dashboard with AI analysis.
- Configurable ticket ID generator with manual override.
- Contact page QR + PDF export (unified layout).
- Duplicate ID validation for manual entries.
- Latin numeral system in analytics (ar-SY-u-nu-latn).
- Tools page ID configuration interface.
- Unified PDF receipt layouts across contact & ticket pages.

To restore to this snapshot:

```bash
git checkout restore-20250910-210000
```

To push the tag to remote:

```bash
git push origin restore-20250910-210000
```
