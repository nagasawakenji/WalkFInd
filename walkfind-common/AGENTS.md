# AGENTS.md — walkfind-common

This module contains shared code used by both `walkfind-web` and `walkfind-lambda`.

---

## What to change here

Edit this module when you need:
- Shared domain models / enums / constants
- Shared DTOs (request/response)
- Validation logic (common)
- MyBatis mapper interfaces / XML shared across modules
- Shared exceptions / error codes

---

## What NOT to do here

- Do NOT add AWS-specific code.
- Do NOT add web-only (Spring MVC) code.
- Do NOT add Lambda handler logic.
- Do NOT add environment-specific configuration.

This module must remain reusable by all backend modules.

---

## How to test

From repo root:

- Fast compile:
    - `./mvnw -q -DskipTests package`

- Tests:
    - `./mvnw -q test`

If you changed DTO/Mapper/Domain:
- Ensure compilation succeeds for both web and lambda modules (no missing references).

---

## Rules

- Keep backward compatibility when possible.
- Do not break serialization formats unexpectedly.
- If changing DB-related models, update the relevant mappers and ensure callers compile.
