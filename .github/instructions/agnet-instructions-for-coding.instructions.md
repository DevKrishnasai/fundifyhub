---
applyTo: '**'
---
# fundifyhub — Contributor & Coding Agent Guidelines

These instructions are for **all contributors (including coding agents)** working in the fundifyhub monorepo. Follow them exactly to keep the codebase consistent and maintainable.

> If something here conflicts with working code that already exists in the repo, **copy the existing pattern** unless you have an explicit reason (and a PR note) to change it.

---

## 1) Monorepo basics

* **Single source of truth:** This repository is a monorepo. Treat it as one system with shared standards.
* **Workspace layout:**

  * `apps/` — runnable applications (e.g., web, admin, services).
  * `packages/` — shared libraries (UI, utils, API clients, configs).
  * `tools/` — local CLIs, scripts, generators.
  * `docs/` — documentation, ADRs (Architecture Decision Records), diagrams.
* **Do not invent new top-level folders.** If you think one is needed, open an issue first.
* **Reuse first:** before writing new code, search for an existing package/component/function that solves it.

---

## 2) Getting started

1. **Clone** the repo and check the default branch (usually `main`).
2. **Node & package manager**: use the versions defined in `.nvmrc`/`engines` and the package manager configured in the repo (e.g., `pnpm`/`npm`/`yarn`).
3. **Install**: `pnpm install` (or the repo’s documented command).
4. **Bootstrap**/build everything: `pnpm build`.
5. **Run** the target app: e.g., `pnpm -C apps/web dev`.
6. **Environment variables**: copy from `.env.example` at the app level; never commit secrets.

> If any of the above commands differ in this repo, **follow the existing scripts** in `package.json`.

---

## 3) Branching & commits

* **Branching model:** trunk-based with short-lived feature branches.

  * Branch name format: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`, `docs/<scope>`.
  * Examples: `feat/auth-login`, `fix/payments-webhook`.
* **Commits:** use **Conventional Commits**.

  * `feat(ui): add Button.solid variant`
  * `fix(api): handle 401 on token refresh`
  * `chore(repo): bump deps`
  * `docs(readme): quickstart`
* **One logical change per PR.** Keep PRs small and focused.

---

## 4) Pull requests

* **Target branch:** `main` unless the repo specifies otherwise.
* **PR title:** Conventional Commit style, summarizing the change.
* **PR description:**

  * What & why (link issues).
  * Screenshots or CLI output where relevant.
  * Breaking changes & migration notes (if any).
* **Checklist (must pass before review):**

  * [ ] `pnpm typecheck` (or equivalent) succeeds
  * [ ] `pnpm lint` succeeds and code is formatted (`pnpm format`)
  * [ ] Tests added/updated and `pnpm test` passes
  * [ ] No new warnings in console or CI logs
  * [ ] Reused existing components/functions where possible
  * [ ] Updated docs/READMEs and `.env.example` if needed

> **Agents:** never open a PR that fails typecheck, lint, or tests.

---

## 5) Code style & quality

* **TypeScript:** `strict` mode. Avoid `any`; prefer precise types.
* **ESLint + Prettier:** use repo configs; do not override without discussion.
* **Naming:** match existing patterns. Use US English, descriptive names, nouns for components/classes, verbs for functions.
* **File structure:**

  * **Apps:** `apps/<app-name>/src/...`
  * **Packages:** `packages/<pkg-name>/src/...` and export only via `index.ts`.
  * Keep public API surface small; internal modules go under `internal/`.
* **Imports:** no deep relative imports across packages (`../../..`). Use workspace aliases.
* **Error handling:** never swallow errors. Prefer `Result`-like patterns or typed errors; log with context.
* **Logging:** use shared logger from `packages/logger` (or the existing repo pattern).
* **Security:** sanitize inputs, validate all external data, never log secrets.

---

## 6) Components & UI (if applicable)

* **Design system first:** use shared UI components from `packages/ui` before adding new ones.
* **New component checklist:**

  * [ ] Place in `packages/ui/src/<Component>/...`
  * [ ] Add stories/examples if Storybook exists
  * [ ] Add tests (render + accessibility basics)
  * [ ] Export from `packages/ui/src/index.ts`
  * [ ] Document props and usage in JSDoc/MDX

---

## 7) APIs, services, and data

* **API clients:** live in `packages/api-client` (or existing package). Generate types from OpenAPI/TS models if available.
* **Contracts are code:** define request/response types; no `any` in public boundaries.
* **Validation:** use the shared schema library (e.g., `zod`) at boundaries (HTTP, DB, queue).
* **Migrations:**

  * DB changes require a migration and a **Migration Notes** section in the PR.
  * Never run destructive changes without backups and review.

---

## 8) Tests

* **Pyramid:** unit > integration > e2e. Cover critical paths.
* **Where:** tests live next to code (`*.test.ts`) or under `tests/` per existing convention.
* **Minimums:** aim for meaningful coverage on new code; don’t chase % blindly. Cover edge cases and failures.
* **Deterministic:** tests must be hermetic; avoid flakiness and real network calls (use mocks).

---

## 9) Performance, accessibility & i18n (web)

* **Performance:** watch bundle size; lazy-load heavy chunks; avoid N+1 requests.
* **Accessibility:** semantic HTML, ARIA only when necessary; keyboard navigation.
* **i18n:** if present, all user text must be translatable; no hard-coded strings.

---

## 10) Documentation

* Keep **README.md** in each app/package up to date (setup, scripts, usage).
* For architectural or noteworthy changes, add an **ADR** under `docs/adr/`:

  * Naming: `YYYY-MM-DD-meaningful-title.md`
  * Include context, decision, alternatives, consequences.

---

## 11) Versioning & releases

* Use **changesets** or existing release tooling if present.
* Bump versions for public packages only when their exported API changes.
* Follow **SemVer** across packages.

---

## 12) CI/CD

* All PRs must pass CI checks (typecheck, lint, test, build).
* Don’t merge with red CI.
* If CI config needs changes, do it in a separate PR or a clearly-scoped commit.

---

## 13) Secrets & config

* Never commit secrets. Use `.env` files locally and secret managers in environments.
* Update `.env.example` when adding new variables.
* Validate required env vars at process start.

---

## 14) Adding a new app or package

1. **Check first** that it doesn’t exist already.
2. **Scaffold** using the existing pattern (copy a similar app/package and adapt).
3. **Name** with clear scope; avoid generic names (`core`, `common`).
4. **Wire up** build/test/lint scripts.
5. **Export** only the intended public surface from `index.ts`.
6. **Document** setup and usage in a local README.

> **Agents:** Never introduce a new dependency or package without checking if it already exists in the monorepo.

---

## 15) Definition of Done (DoD)

A change is **Done** when:

* [ ] Feature is implemented and behind flags if risky
* [ ] Typecheck/lint/tests pass locally and in CI
* [ ] Docs/READMEs/examples updated
* [ ] `.env.example` updated (if applicable)
* [ ] Screenshots/recordings attached (UI)
* [ ] No new TODOs left behind without an issue reference

---

## 16) Issue labels & triage

* Use labels for `bug`, `feature`, `tech-debt`, `docs`, `infra`, `priority/*`, `area/*`.
* Link PRs to issues. Close via keywords (`Closes #123`).

---

## 17) Code review guidelines

* Be kind, specific, and actionable. Review for correctness, clarity, cohesion, and consistency.
* Prefer questions over commands. Suggest concrete alternatives.
* Approve only when DoD is met and PR checklist is complete.

---

## 18) Local scripts (examples; use repo’s actual scripts)

```bash
# build everything
yarn build
# lint & format
yarn lint && yarn format
# typecheck
yarn typecheck
# test
yarn test
# run a specific app
yarn --cwd apps/web dev
```

> Replace `yarn` with the package manager used in this repo (e.g., `pnpm`), and use the actual script names.

---

## 19) Breaking changes

* Mark PRs with `BREAKING CHANGE:` in the description.
* Provide **migration steps** and note affected apps/packages.

---

## 20) Contact & decisions

* Unsure about anything? **Mirror existing code** and add a PR note.
* For significant changes, open an issue or ADR before coding.

---

### PR Template (copy into `.github/pull_request_template.md`)

```
## Summary
-

## Screenshots / Logs (if applicable)
-

## How to test
-

## Checklist
- [ ] Typecheck passes
- [ ] Lint & format pass
- [ ] Tests added/updated
- [ ] Reused existing components/functions
- [ ] Docs & .env.example updated (if needed)
- [ ] No breaking changes (or documented if any)

Closes #
```

---

**Thank you for contributing!** Stick to the patterns you see in the repo, keep PRs small, and document your decisions.
