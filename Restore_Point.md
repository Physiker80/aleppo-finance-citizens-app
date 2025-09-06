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
