### Coding Rules (For Agent & All Contributors)

**General**

* Follow **TypeScript strict mode**.
* **Never use `any`** unless absolutely unavoidable and clearly commented with a reason and a TODO to remove it.
* Prefer **small, focused functions and files** over large “god files”.
* Every change must **compile, lint, and build** successfully.

---

#### 1. Structure & Boundaries

* **Domain logic**: only in `apps/main-backend/src/domain/**`
* **Controllers**: `apps/main-backend/src/api/http/controllers/**`

  * Only: validate input, call domain service, map result → response.
* **Routes**: `apps/main-backend/src/api/http/routes/**`
* **Middlewares**: `apps/main-backend/src/api/http/middlewares/**`
* **Infra adapters**: `apps/main-backend/src/infra-adapters/**`
* **Providers / SDKs**: only in `packages/providers/**`
* **DB access**: only via `@fundify/prisma`
* **Shared types/enums/constants**: only in `@fundify/types`
* **Pure helpers**: only in `@fundify/utils`
* **Logging**: only via `@fundify/logger`
* **Frontend**:

  * data access via `lib/api/client.ts` + `lib/adapters/**`
  * server state via React Query
  * app state via Zustand or similar in `lib/state/**`
  * no direct SDKs or random `fetch` calls in components

---

#### 2. Naming & Style

* Files: **kebab-case**

  * `loan-service.ts`, `request-routes.ts`
* Folders: **kebab-case**

  * `loan`, `loan-events`, `access-control`
* Types / interfaces / components: **PascalCase**

  * `LoanService`, `LoanStatus`, `LoanTableProps`
* Variables / functions: **camelCase**

  * `loanId`, `createLoan`, `fetchRequests`
* Constants: **SCREAMING_SNAKE_CASE**

  * `DEFAULT_PAGE_SIZE`, `MAX_LOAN_AMOUNT_INR`

---

#### 3. Type Safety & Validation

* No `any` (unless explicitly justified with a comment and TODO).
* Use **`zod`** for:

  * HTTP request validation (body, query, params)
  * Webhook payload validation
  * Config validation (`loadConfig`)
* Shared domain types/enums must come from `@fundify/types`:

  * Do **not** redefine enums like statuses, roles, channels, etc. in each app.

---

#### 4. Error Handling

* Domain:

  * Throw **typed errors** (e.g. `DomainError` with `code`, `message`).
* Controllers:

  * Catch domain errors and translate to HTTP:

    * `400` validation
    * `401/403` auth/rbac
    * `404` not found
    * `409` conflict
    * `500` unexpected
* Never leak internal error details in API responses.
* Use logger for all unexpected errors, with context.

---

#### 5. Logging & Observability

* Use `@fundify/logger`:

  * Add `serviceName`, `correlationId`/`requestId`, `userId` where possible.
* No `console.log` in production code.
* Log at appropriate levels: `debug`, `info`, `warn`, `error`.

---

#### 6. Tests & Quality

* For new domain logic → add or extend **unit tests**.
* For critical endpoints → add **integration tests**.
* For key UI flows → add **basic component/e2e tests**.
* Ensure **`pnpm -r lint`, `pnpm -r test`, `pnpm -r build`** pass after substantial changes.

---

#### 7. Refactoring Rules (for Agent)

When refactoring or cleaning up:

* If something is:

  * duplicated → **extract** to `@fundify/types` or `@fundify/utils`.
  * constants scattered → centralize in `@fundify/types`
  * directly using SDKs → move behind `@fundify/providers`.
  * mixing concerns (domain + HTTP + DB) → split into correct layers.
* Prefer **incremental refactors**: small, safe steps that compile and pass tests.
* After each meaningful step:

  * Re-check architecture boundaries.
  * Run lint/test/build (or suggest running) and fix failures.
* Keep `TODO.md` updated:

  * Mark completed items as `[x]`.
  * Add new `[ ]` items for discovered technical debt or missing work.

---

#### 8. Documentation & JSDoc

* For exported domain functions, adapters, and providers:

  * Add **JSDoc** describing:

    * what it does,
    * important invariants,
    * expected inputs/outputs.
* For complex business rules:

  * Add a short comment reference to the relevant flow in `ARCHITECTURE.md` if helpful.
