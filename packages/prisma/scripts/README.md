# Prisma sequence helpers

Utilities to create DB sequences and wire id defaults for tables in this repo.

Files
- `add-sequence-for-table.js` — create a sequence and set a table's `id` default to `PREFIX || nextval(seq)`.
- `set-sequence-ids.js` — (legacy) batch script used during migration. Keep for reference.

Usage

Run helpers from repo root. They load the repository `.env` by default.

Examples (PowerShell):

```powershell
# Create sequence and set default for `requests` without truncating
node packages/prisma/scripts/add-sequence-for-table.js --table requests --seq requests_seq --prefix REQ

# Create and set default and truncate (DESTRUCTIVE) — use only when you intend to wipe data
node packages/prisma/scripts/add-sequence-for-table.js --table requests --seq requests_seq --prefix REQ --force
```

Notes
- These helpers are intentionally non-destructive by default.
- Prefer adding `seq` + `publicId` fields in Prisma models and using application-side create+update for safety. Use these scripts when you want DB-level defaults.
