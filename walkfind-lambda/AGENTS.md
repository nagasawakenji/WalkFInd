# AGENTS.md — walkfind-lambda

AWS Lambda (SAM) Spring Boot application.
This is the production/staging backend.

---

## Primary purpose

- API Gateway + Lambda execution
- Cognito-based auth (JWT validation / authorizer integration)
- S3 presigned URL flows
- Secrets Manager configuration

---

## Edit here when

- AWS integration behavior changes
    - S3 upload/download flow
    - presigned URL generation
    - Cognito-related auth behavior
    - SQS publish (embedding job enqueue)
- Lambda runtime/performance fixes (timeouts, memory concerns)
- Production-only configuration needs (but prefer config files)

---

## Do NOT do

- Do NOT add unsafe IAM permissions unless explicitly required.
- Do NOT change resource names / SAM template drastically unless requested.
- Do NOT add destructive operations (drop DB, delete buckets).
- Do NOT leak credentials or tokens.

---

## How to test (local)

From repo root:
- `./mvnw -q -pl walkfind-lambda test`

If you need SAM local, document commands but do not assume user has it installed.

---

## Key rules

- Keep local/prod differences in config (properties/env), not hardcoded.
- Prefer minimal changes to avoid breaking production.
- If touching auth:
    - never weaken authorization checks
    - ensure requester identity is validated from token/claims
