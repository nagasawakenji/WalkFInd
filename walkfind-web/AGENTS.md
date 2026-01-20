# AGENTS.md — walkfind-web

Local Spring Boot application for fast development & verification.

---

## Primary purpose

- Local development / debugging
- Service-layer integration checks
- API behavior verification without AWS deployment

---

## Edit here when

- You need to modify controllers (local endpoints)
- You need to adjust service logic for local runs
- You want to add local-only debug endpoints (ONLY if explicitly requested)
- You want to run backend locally and verify behavior quickly

---

## Do NOT do

- Do NOT add AWS resources or SAM config here.
- Do NOT hardcode secrets or prod URLs.
- Do NOT implement Cognito-specific authorizer logic here (keep it in lambda module).

---

## How to run (typical)

From repo root:
- `./mvnw -q -pl walkfind-web spring-boot:run`

(If this fails due to env vars, stop and explain required variables.)

---

## How to test

From repo root:
- `./mvnw -q -pl walkfind-web test`

---

## Code rules

- Prefer calling shared logic in `walkfind-common`
- Keep controller thin (validation + routing)
- Put business logic in Service layer
- Follow existing exception handling patterns
