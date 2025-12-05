
# Fundify – OpenCode Agents Rules (Final)

This file defines how OpenCode agents must behave in this repo.

---

## 1. Mission

Agents are responsible for:

- Migrating and refactoring the codebase to fully match:
  - ARCHITECTURE.md
  - ENGINEERING_GUIDELINES.md
  - TODO.md
- Making the system **production-ready**.
- Keeping `TODO.md` as the accurate progress log.

The **existing Prisma schema** in `packages/prisma/prisma/schema.prisma` is canonical and must not be replaced wholesale.

---

## 2. Sources of Truth (Priority Order)

1. `ENGINEERING_GUIDELINES.md`
2. `ARCHITECTURE.md`
3. `TODO.md`
4. `.opencode/AGENTS.md`

If there is conflict, #1 wins.

---

## 3. Autonomy Rules

- Do **not** ask the user for confirmation.
- Do **not** ask the user questions unless:
  - docs contradict each other, or
  - a business rule is genuinely undefined.
- You **may**:
  - refactor
  - delete dead/duplicate code
  - restructure files/folders
  - introduce new modules
  - adjust schema carefully if necessary (but never drop important fields/models).

---

## 4. Workflow (Per Task / Changeset)

For every change:

1. **PLAN**
   - Read the next `[ ]` item in `TODO.md`.
   - Read related sections in ARCHITECTURE + ENGINEERING_GUIDELINES.
   - Decide on a small, coherent changeset.
   - Summarize in the conversation:
     - files to create
     - files to modify
     - files to delete
     - purpose of each change
   - Validate against the docs.
   - If valid → auto-approve and continue.

2. **APPLY**
   - Make edits according to the plan.
   - Respect boundaries:
     - use `@fundify/types` for shared types
     - use `@fundify/utils` for pure helpers
     - use `@fundify/providers` for IO
     - use `@fundify/prisma` for DB
   - Keep strict typing (no `any`).

3. **VERIFY**
   - Summarize what actually changed.
   - Compare with the plan and architecture:
     - domain logic in domain
     - controllers thin
     - providers only IO
     - frontend only uses adapters
   - Fix violations immediately.

4. **CHECK (Lint/Test/Build)**
   - After significant changes, run via bash if available:
     - `pnpm -r lint`
     - `pnpm -r test`
     - `pnpm -r build`
   - If something fails:
     - inspect error
     - fix the cause
     - re-run until passing or genuinely blocked.

5. **UPDATE TODO.md**
   - Mark completed items as `[x]`.
   - Add new `[ ]` tasks if new necessary work is discovered.
   - Keep tasks ordered and clean.

---

## 5. Enforcement Requirements

Agents MUST ensure:

- No business logic remains in controllers or providers.
- All multi-app types/constants/enums live in `packages/types` (or appropriate package).
- All shared helpers move to `packages/utils`.
- All direct SDK usage (Razorpay, UploadThing, WhatsApp, Redis, Socket.IO) is isolated to `packages/providers`.
- Frontend pages call backend via adapters/hooks and React Query, not raw fetch.
- RBAC is enforced via centralized helpers (not ad-hoc conditionals everywhere).
- Notifications and realtime use the standardized flow (domain events → orchestrator → queues/workers → realtime).

---

## 6. Prohibited Behavior

Agents must not:

- Introduce `any` unless absolutely necessary and documented.
- Create new one-off schemas instead of using existing Prisma models.
- Duplicate enums or constants instead of importing shared ones.
- Leave code in a non-compiling state at the end of a big step.
- Skip tests/lint/build when they exist.

---

## 7. If Blocked

If genuinely blocked:

- Stop destructive changes.
- Summarize:
  - docs you followed,
  - what you attempted,
  - where the ambiguity lies,
  - suggestions for resolution.
- Present this to the user.

