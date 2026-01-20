# AGENTS.md — WalkFind (Codex Cloud instructions)

This file is instructions for coding agents (Codex).  
Follow these rules strictly when making changes.

---

## 1. Project overview

WalkFind is a photo contest platform.
Users submit photos for an admin-provided theme, and users vote to decide winners.
This repo is a **monorepo** containing backend (Spring Boot), AWS Lambda (SAM), ML worker, and frontend.  
(Backend provides serverless API on AWS and a local dev web mode.)  
Ref: README.md for architecture and module roles.

---

## 2. Monorepo structure (where to edit)

- `walkfind-common/`
    - Shared domain models, DTOs, MyBatis mappers, exceptions.
    - Used by both `walkfind-web` and `walkfind-lambda`.

- `walkfind-web/`
    - Local development Spring Boot app.
    - Used for fast iteration & integration tests (service-layer tests).

- `walkfind-lambda/`
    - AWS Lambda (SAM) Spring Boot app (production/staging).
    - API Gateway + Cognito Authorizer, S3 presigned URLs, Supabase(PostgreSQL), Secrets Manager.

- `walkfind-ml-worker/`
    - ML embedding worker (CLIP embeddings).
    - Uses async queue: ElasticMQ in local, SQS in production.

- `walkfind-frontend/`
    - React + TypeScript frontend.

---

## 3. Most common tasks (choose the correct module)

### A) Backend API behavior change
1. Prefer editing domain/model/DTO/mapper in `walkfind-common/`
2. Then update service/controller in `walkfind-web` and/or `walkfind-lambda`
3. Add/adjust tests in the relevant module

### B) Lambda-only behavior (AWS integrations)
- Edit only `walkfind-lambda/`
- Do NOT change infrastructure (SAM template / policies) unless explicitly required.

### C) ML embedding / async pipeline change
- Edit only `walkfind-ml-worker/`
- Keep local (ElasticMQ) and prod (SQS) compatibility.

### D) UI changes
- Edit only `walkfind-frontend/`

---

## 4. Commands to run (safe-first)

### Maven (backend)
Use Maven Wrapper from repo root:

- Fast compile:
    - `./mvnw -q -DskipTests package`

- Unit / integration tests:
    - `./mvnw -q test`

If you are changing only one module, you may run Maven with `-pl <module>` to limit scope.

### Frontend
From `walkfind-frontend/`:

- Install:
    - `npm ci`
- Dev:
    - `npm run dev`
- Lint / typecheck (if configured):
    - `npm run lint`
    - `npm run build`

> IMPORTANT: If any command fails due to missing env vars or external services, stop and explain what is required (do not guess secrets).

---

## 5. Database & migrations

- DB: Supabase (PostgreSQL)
- Migrations: Flyway-managed

Rules:
- When you add/change tables/columns:
    1) add a new Flyway migration (do NOT edit already-applied migrations),
    2) update DTO / MyBatis mapper accordingly,
    3) add/adjust tests.

Never include real credentials in code or docs.

---

## 6. Security & correctness rules (must follow)

- Do NOT commit secrets, tokens, or private URLs.
- Do NOT weaken authentication/authorization.
- Keep "public endpoints" and "auth-required endpoints" clearly separated.
- Prefer minimal, localized changes.
- Preserve existing error-handling patterns and validation.

---

## 7. AWS / serverless rules (do not break prod)

- Do NOT deploy or run destructive operations.
- Do NOT modify `samconfig.toml`, IAM policies, or resource names unless asked.
- Avoid changing S3 bucket paths / keys unless the task explicitly requires it.
- Keep local/prod differences controlled by config (properties) rather than hardcoding.

---

## 8. Code style & PR hygiene

- Respect existing package naming and layering.
- Keep methods small and readable; avoid unnecessary new dependencies.
- Always include:
    - a short explanation of what changed,
    - why it changed,
    - how to test it.

---

## 9. When uncertain

If any requirement is ambiguous:
- Read `README.md` first.
- Search for similar patterns in the existing codebase.
- Make the smallest change that satisfies the request.
- Explain assumptions clearly.
