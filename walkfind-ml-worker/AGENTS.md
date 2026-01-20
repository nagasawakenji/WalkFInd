# AGENTS.md — walkfind-ml-worker

ML embedding worker module.
Generates embeddings (e.g., CLIP-based) and stores/updates vector data for search or scoring.

---

## Primary purpose

- Consume async jobs from queue
    - Local: ElasticMQ
    - Prod: SQS
- Generate embeddings
- Write results to DB / storage

---

## Edit here when

- Embedding generation logic changes
- Queue message format changes
- Retry / idempotency handling changes
- Performance improvements (batching, caching)
- Error handling / monitoring improvements

---

## Do NOT do

- Do NOT change API Gateway / HTTP endpoint behavior here.
- Do NOT add UI-related code.
- Do NOT hardcode queue URLs or secrets.

---

## How to test

From repo root:
- `./mvnw -q -pl walkfind-ml-worker test`

If the worker requires external services (queue/db):
- Do not guess credentials
- Explain required env vars and local setup steps clearly

---

## Rules (important)

- Ensure idempotency:
  same job re-processed should not corrupt data.
- Keep local/prod compatible message parsing.
- Fail safely:
  log enough context (without leaking secrets) and avoid infinite loops.
