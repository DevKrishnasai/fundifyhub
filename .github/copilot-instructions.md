# Engineering Guidelines & Rules for the Coding Agent

These rules are **mandatory** for any code or changes made in this repo.
The goal: **clean, consistent, type-safe, future-proof** code that matches our architecture.

---

## 1. General Principles

1. **Type-safety first**

   * No `any` type allowed (except in very rare, well-justified cases with comments).
   * Use `unknown` + proper narrowing instead of `any`.

2. **Separation of concerns**

   * Domain logic stays in **domain services**, not controllers and not providers.
   * Providers only talk to external systems (Razorpay, UploadThing, WhatsApp, etc.).
   * Frontend components should be mostly **presentational**; data logic goes in **adapters/hooks**.

3. **Consistency over cleverness**

   * Prefer simple, boring, consistent code to “smart” hacks.
   * Follow the same patterns everywhere (e.g. same folder naming, same hook structure).

4. **Small, focused modules**

   * Functions: 10–40 lines where possible.
   * Files: one main concern per file (e.g. `loans.service.ts`, not `loansAndPayments.ts`).

5. **No dead code**

   * Remove unused functions/types/variables.
   * Don’t leave commented-out code lying around.

---

## 2. File, Folder & Naming Conventions

### 2.1. Folder naming

* **Folders**: kebab-case

  * ✅ `loan-service`, `user-profile`, `access-control`
  * ❌ `LoanService`, `User_profile`

In our structure we already use:

* `domain/loans`, `infra-adapters`, `access-control`, etc.

### 2.2. File naming

* **TypeScript/JavaScript files**: kebab-case

  * `loans.service.ts`
  * `assignments.service.ts`
  * `loans.controller.ts`
  * `loans.routes.ts`
  * `rbac.ts`, `env.ts`, `client.ts`

* **React components** (in `/components` or `/app`):

  * Still kebab-case filenames:

    * `loan-table.tsx`
    * `loan-details-card.tsx`
  * Component names are **PascalCase**:

    * `LoanTable`, `LoanDetailsCard`.

### 2.3. Naming for variables, types, etc.

* **Variables & functions** → `camelCase`

  * `loanId`, `customerName`, `fetchLoans`, `createLoanRequest`.
* **Classes & React components & types/interfaces** → `PascalCase`

  * `LoanService`, `LoanCard`, `UserRole`, `LoanStatus`.
* **Enums** → `PascalCase` for name, `SCREAMING_SNAKE_CASE` for values if string enums.
* **Constants** → `SCREAMING_SNAKE_CASE`

  * `MAX_LOAN_TENURE_MONTHS`, `DEFAULT_PAGE_SIZE`.

### 2.4. Names should be explicit

* `loan`, `loanRequest`, `loanId` are good.
* Avoid rubbish like `data1`, `res2`, `tmp`, `obj`.

---

## 3. TypeScript Rules

1. **Strict mode ON**

   * `strict: true` in `tsconfig.json`.
   * No `skipLibCheck` for internal packages.

2. **No `any`**

   * If absolutely impossible, **must** be:

     ```ts
     const foo: any = bar; // TODO: (agent) narrow this type later
     ```
   * This should be rare.

3. **Prefer interfaces & types from `packages/types`**

   * Reuse `Loan`, `User`, `Region`, `NotificationEvent`, etc.
   * Don’t re-create ad-hoc types in apps if shared types exist.

4. **Use `unknown` for dynamic data**

   * Example: webhook payloads:

     ```ts
     function handleWebhook(payload: unknown) {
       // validate using zod before using
     }
     ```

5. **Use zod for input validation**

   * Define schemas in `domain/*/validators.ts` or `utils` where appropriate.
   * Validate request bodies in controllers / route handlers using zod schemas.

6. **Never ignore Promise errors**

   * No bare `promise.then()` without `.catch()` unless `await` is used in a `try/catch`.
   * Use `void someAsyncFn()` only if fire-and-forget is really intended and justified.

---

## 4. JSDoc & Documentation Rules

1. **Every exported function, class, and complex type must have a JSDoc block.**

   Example:

   ```ts
   /**
    * Creates a new loan request for the given customer.
    *
    * @param customerId - ID of the customer creating the loan.
    * @param payload - Loan payload including asset and amount.
    * @returns The created loan with initial status.
    */
   export async function createLoanRequest(customerId: string, payload: CreateLoanPayload): Promise<Loan> {
     // ...
   }
   ```

2. **Domain services & adapters should be well documented**:

   * What they do.
   * What assumptions they make.
   * What errors they might throw.

3. **Public React components** get JSDoc above the component declaration:

   ```ts
   /**
    * Displays a table of loans for the current view (customer/agent/admin).
    */
   export function LoanTable(props: LoanTableProps) { ... }
   ```

4. **Complex interfaces & types** should be documented:

   ```ts
   /**
    * Notification event payload used by the orchestrator.
    */
   export interface NotificationEvent { ... }
   ```

---

## 5. Backend Best Practices

### 5.1. Controllers

* Controllers must:

  * validate input (using `zod` or shared validators),
  * call **domain services**,
  * format HTTP responses.
* Controllers must **NOT**:

  * contain business rules.
  * directly call external providers (Razorpay, Redis, etc.).

### 5.2. Domain services

* Domain services:

  * contain **all business logic**.
  * enforce rules (assignment, status transitions, permissions via RBAC helpers).
  * emit domain events using `events/bus.ts`.

* Domain services must:

  * accept and return typed domain models.
  * not know about HTTP or Express.

### 5.3. Infra adapters

* All external calls go through `infra-adapters` which use `packages/providers`.

  * e.g. `payments-adapter`, `notification-adapter`, `storage-adapter`.

* Adapters:

  * are thin wrappers around provider factories.
  * handle mapping between domain types ↔ provider-specific types.
  * no business rules inside.

### 5.4. Error handling

* Use `try/catch` in controllers and top-level domain functions.
* Throw application-level errors with meaningful codes/messages.

  * e.g. `throw new AppError("LOAN_NOT_FOUND", "Loan not found", 404);`
* Log errors via `logger` with relevant context (userId, loanId, etc.).

---

## 6. Frontend Best Practices

### 6.1. Components

* Prefer smaller components:

  * container components (data fetching & wiring),
  * presentational components (pure UI).

* Don’t put heavy business logic in components:

  * Use hooks (`useLoans`, `useNotifications`) + adapters.

### 6.2. Hooks & React Query

* Use **React Query** for:

  * all server-side data fetching & caching.

* Standard pattern:

  ```ts
  function useLoans(view: LoanView) {
    return useQuery({
      queryKey: ["loans", view],
      queryFn: () => loansAdapter.fetchLoans(view),
    });
  }
  ```

* Mutations:

  * Always handle `onSuccess` and `onError`.
  * On relevant mutation success, invalidate or update related queries.

### 6.3. Forms

* Always use `react-hook-form` + `zod` for forms.

  * Validation schema defined once and reused.

### 6.4. Role-based UI

* Role & region logic lives in `lib/utils/role.ts`.
* Components/pages use helpers:

  * `isCustomer(user)`, `isDistrictAdmin(user)`, etc.
* Don’t hardcode roles in random components; centralize logic.

---

## 7. Realtime Best Practices

1. **Socket.io client** lives in one place: `realtime-adapter.ts`.
2. Don’t open multiple socket connections per tab; reuse one.
3. Use hooks like `useRealtimeLoanUpdates` to subscribe/unsubscribe.
4. On realtime events:

   * Prefer updating React Query cache via `setQueryData` or invalidation.
5. Name events clearly:

   * `loan.update`, `loan.assigned`, `notification.new`, `auction.bid`.

---

## 8. Notifications & Background Jobs

1. Do not send emails/WhatsApp directly in controller or domain service.

   * Always use `notification-adapter.publishEvent` → orchestrator → job → worker.

2. Workers must:

   * respect rate limits,
   * log failures with enough context (user, template, channel).

3. Never block HTTP responses waiting for notifications; use async jobs.

---

## 9. Git & Commit Rules (Agent)

1. Commits must be **scoped & clear**:

   * `feat(loans): add assignment service`
   * `fix(notifications): correct overdue template`
   * `refactor(frontend): extract loan adapter`

2. No huge “everything in one commit” if avoidable.

3. Don’t commit failing tests or lint errors.

---

## 10. TODO / Progress Logging

We maintain a `TODO.md` (or `docs/TODO.md`) at repo root to track work.

**Rules for TODO file:**

* Structure example:

  ```md
  # TODO / Progress

  ## [DATE] Agent Session

  - [x] Implement Loan prisma schema
  - [x] Add LoanService.createLoanRequest
  - [ ] Implement AssignmentService.selfAssignLoanToDistrictAdmin
  - [ ] Frontend: /dashboard/loans basic list for customer
  - [ ] Add realtime loan.update listener on frontend
  ```

* For every session / batch of changes, the agent must:

  * Add a new section or update an existing one.
  * Mark items `[x]` when completed.
  * Add new tasks when new work is started.

* Keep TODO items **short and action-based**:

  * “Implement X”
  * “Refactor Y”
  * “Add Z tests”

---

## 11. What the Agent Must Never Do

1. **Never**:

   * introduce `any` without a comment + reason.
   * bypass type checks with `as any` without justification.
2. **Never**:

   * call external SDKs directly in controllers or domain → must use `providers`.
3. **Never**:

   * mix different responsibilities in a single file (e.g. controller + service in one file).
4. **Never**:

   * introduce breaking schema changes without updating types & relevant services.

- check details what to do in REFINED_CODEBASE.md