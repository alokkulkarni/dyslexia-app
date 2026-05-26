# Deployment Playbook — Dyslexia Flashcards App

## 1. Document Control

| Field | Value |
|---|---|
| **Title** | Dyslexia Flashcards App — Production Deployment Playbook |
| **Playbook ID** | PLY-DYS-001 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Owner** | Alok Kulkarni |
| **Created** | 2026-05-26 |
| **Last Reviewed** | 2026-05-26 |
| **Related SID** | SID-DYS-001 |
| **Target Go-Live** | 2026-05-31 |

### Approvers

| Role | Name | Approved | Date |
|---|---|---|---|
| Service Owner | Alok Kulkarni | [ ] | [DATE] |
| Security Reviewer | [REVIEWER_NAME] | [ ] | [DATE] |
| Operations Lead | [REVIEWER_NAME] | [ ] | [DATE] |
| Business Stakeholder | [REVIEWER_NAME] | [ ] | [DATE] |

### Revision History

| Version | Date | Author | Summary |
|---|---|---|---|
| 1.0.0 | 2026-05-26 | Alok Kulkarni | Initial draft |

---

## 2. Purpose and Scope

### Objective

This playbook governs the controlled production deployment of the Dyslexia Flashcards App — a serverless, AI-powered educational web application built on AWS. It defines the end-to-end deployment strategy, phase-by-phase execution steps, rollback procedures, communication plan, and go/no-go criteria required to safely transition the service from staging to production on **2026-05-31**.

### In-Scope

- AWS SAM stack deployment to the production AWS account (eu-west-2)
- React frontend build, S3 upload, and CloudFront cache invalidation
- Amazon Cognito User Pool and client configuration
- Amazon DynamoDB table provisioning and PITR validation
- AWS Lambda function deployment (AuthFunction, UploadFunction, GenerateFunction, GetFlashcardsFunction)
- Amazon API Gateway stage deployment and throttle configuration
- CloudWatch alarm activation and X-Ray tracing verification
- Amazon Bedrock model access verification (Claude 3 Haiku)
- Post-deployment smoke testing and hypercare monitoring

### Out-of-Scope

- Native mobile application deployment
- Multi-region failover configuration (documented separately)
- Third-party LMS integrations
- COPPA / GDPR-K parental consent implementation (prerequisite — must be complete before go-live)
- Automated test suite creation (prerequisite — must be complete before go-live)

### Intended Audience

Engineering team, operations staff, security reviewers, and business stakeholders involved in the production go-live of the Dyslexia Flashcards App.


---

## 3. Component Overview

### Architecture Reference

See `docs/architecture.md` for the full architecture diagram. Summary topology:

```
Browser → CloudFront (CDN) → S3 (React SPA)
Browser → API Gateway (Cognito JWT) → Lambda ×4
Lambda (generate) → S3 (documents) → Bedrock (Claude 3 Haiku) → DynamoDB
Lambda (flashcards) → DynamoDB (read)
```

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + Vite | 19.x / 8.x |
| Backend Runtime | Node.js on AWS Lambda (ARM64) | 20.x |
| IaC | AWS SAM | 2016-10-31 transform |
| Auth | Amazon Cognito User Pool | AWS Managed |
| AI / ML | Amazon Bedrock — Claude 3 Haiku | anthropic.claude-3-haiku-20240307-v1:0 |
| Database | Amazon DynamoDB (on-demand) | AWS Managed |
| Object Storage | Amazon S3 (×2 buckets) | AWS Managed |
| CDN | Amazon CloudFront | AWS Managed |
| Observability | AWS X-Ray + CloudWatch | AWS Managed |

### Deployment Model

**Immutable / Replace-in-place** via AWS SAM (`sam build && sam deploy`).

- Backend: CloudFormation change set replaces Lambda function code and configuration atomically. API Gateway stage is redeployed on each `sam deploy`.
- Frontend: `npm run build` produces a new `dist/` artefact. Assets are synced to the S3 frontend bucket and a CloudFront invalidation is issued for `/*`.
- Rollback: Previous CloudFormation stack version is restored via `sam deploy` with the prior artefact, or via CloudFormation stack rollback.

---

## 4. Prerequisites

### Access Requirements

| Requirement | Detail | Verified |
|---|---|---|
| AWS CLI configured | Profile with `AdministratorAccess` or scoped deploy role for production account | [ ] |
| AWS SAM CLI installed | Version ≥ 1.100.0 | [ ] |
| Node.js installed | Version 20.x LTS | [ ] |
| npm installed | Version ≥ 10.x | [ ] |
| Git access | Read access to `dyslexia-app` repository, `main` branch | [ ] |
| AWS Bedrock model access | Claude 3 Haiku enabled in eu-west-2 console | [ ] |
| Production AWS account ID | `[PROD_ACCOUNT_ID]` | [ ] |
| S3 deployment bucket | SAM artefact bucket exists in eu-west-2: `[SAM_ARTIFACT_BUCKET]` | [ ] |

### Required Tooling

```bash
# Verify all tools before deployment window opens
aws --version          # >= 2.x
sam --version          # >= 1.100.0
node --version         # v20.x
npm --version          # >= 10.x
git --version
```

### Environment Readiness Checklist

- [ ] Staging deployment validated and all acceptance criteria passed (see §11)
- [ ] Security review sign-off obtained (SID-DYS-001 §11)
- [ ] COPPA / GDPR-K parental consent flow implemented and tested (R-02)
- [ ] Automated test suite passing in CI (R-08)
- [ ] CloudWatch alarm SNS topic / alert channel configured: `[ALERT_CHANNEL]`
- [ ] Change request raised and CAB approval obtained (see §7)
- [ ] All approvers in §1 have signed off
- [ ] Rollback artefacts from previous stack version available (or N/A for first deployment)
- [ ] AWS Service Health Dashboard checked — no active incidents in eu-west-2
- [ ] On-call engineer (Alok Kulkarni) available for the full deployment window


---

## 5. Deployment Strategy

The deployment is structured into five sequential phases. Each phase must complete successfully before the next begins. The total estimated deployment window is **90–120 minutes**.

---

### Phase 1 — Pre-Deployment Validation

**Objective:** Confirm all prerequisites are met and the production environment is ready before any changes are applied.

**Duration estimate:** 15 minutes

**Dependencies:** All items in §4 Prerequisites must be checked.

**Steps:**

1. Confirm AWS CLI identity and target account:
   ```bash
   aws sts get-caller-identity
   # Verify AccountId matches [PROD_ACCOUNT_ID]
   ```
2. Check AWS Service Health Dashboard for eu-west-2 incidents: https://health.aws.amazon.com/health/status
3. Verify Bedrock model access in the production account:
   ```bash
   aws bedrock list-foundation-models --region eu-west-2 \
     --query "modelSummaries[?modelId=='anthropic.claude-3-haiku-20240307-v1:0']"
   # Expected: non-empty result with modelLifecycleStatus ACTIVE
   ```
4. Confirm the SAM artefact S3 bucket exists:
   ```bash
   aws s3 ls s3://[SAM_ARTIFACT_BUCKET] --region eu-west-2
   ```
5. Pull latest `main` branch and verify commit hash matches the approved build:
   ```bash
   git checkout main && git pull origin main
   git log --oneline -1
   # Record commit SHA: [COMMIT_SHA]
   ```
6. Notify stakeholders that deployment is commencing (see §10 Communication Plan).

**Rollback trigger:** Any prerequisite check fails → abort deployment, do not proceed to Phase 2. Notify stakeholders.

---

### Phase 2 — Backend Infrastructure Deployment (AWS SAM)

**Objective:** Deploy all AWS infrastructure and Lambda function code to production via AWS SAM.

**Duration estimate:** 20–30 minutes

**Dependencies:** Phase 1 complete. SAM artefact bucket available.

**Steps:**

1. Navigate to the backend directory:
   ```bash
   cd /path/to/dyslexia-app/backend
   ```
2. Install backend dependencies:
   ```bash
   cd src && npm ci --omit=dev && cd ..
   ```
3. Build the SAM application:
   ```bash
   sam build --use-container
   # Expected: Build Succeeded
   ```
4. Deploy to production (guided first time; use `--no-confirm-changeset` for subsequent):
   ```bash
   sam deploy \
     --stack-name dyslexia-flashcards-prod \
     --s3-bucket [SAM_ARTIFACT_BUCKET] \
     --region eu-west-2 \
     --capabilities CAPABILITY_IAM \
     --parameter-overrides Environment=prod \
     --confirm-changeset
   ```
5. Review the CloudFormation change set carefully before confirming. Verify:
   - No unexpected resource deletions
   - Lambda function code updates are present
   - DynamoDB table is not being replaced (would cause data loss)
6. Confirm the change set and wait for `CREATE_COMPLETE` or `UPDATE_COMPLETE`.
7. Capture stack outputs:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name dyslexia-flashcards-prod \
     --region eu-west-2 \
     --query "Stacks[0].Outputs"
   # Record: ApiEndpoint, CloudFrontUrl, FrontendBucketName, DocumentBucketName
   ```
8. Verify Lambda functions are deployed and active:
   ```bash
   aws lambda list-functions --region eu-west-2 \
     --query "Functions[?starts_with(FunctionName,'dyslexia')].[FunctionName,Runtime,State]"
   # Expected: 4 functions, Runtime nodejs20.x, State Active
   ```
9. Verify DynamoDB PITR is enabled:
   ```bash
   aws dynamodb describe-continuous-backups \
     --table-name DyslexiaFlashcards \
     --region eu-west-2 \
     --query "ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus"
   # Expected: "ENABLED"
   ```

**Rollback trigger:** CloudFormation stack reaches `ROLLBACK_COMPLETE` or `UPDATE_ROLLBACK_COMPLETE` → capture error, notify stakeholders, proceed to §9 Rollback Strategy.


---

### Phase 3 — Frontend Build and Deployment

**Objective:** Build the React SPA, upload assets to S3, and invalidate the CloudFront cache.

**Duration estimate:** 10–15 minutes

**Dependencies:** Phase 2 complete. `ApiEndpoint` and `CloudFrontUrl` captured from stack outputs.

**Steps:**

1. Navigate to the frontend directory:
   ```bash
   cd /path/to/dyslexia-app/frontend
   ```
2. Set production environment variables:
   ```bash
   # Edit .env (do NOT commit this file)
   VITE_API_ENDPOINT=https://{api-id}.execute-api.eu-west-2.amazonaws.com/Prod
   VITE_USER_POOL_ID=[COGNITO_USER_POOL_ID]
   VITE_USER_POOL_CLIENT_ID=[COGNITO_CLIENT_ID]
   VITE_REGION=eu-west-2
   ```
3. Install frontend dependencies:
   ```bash
   npm ci
   ```
4. Run the production build:
   ```bash
   npm run build
   # Expected: dist/ directory created, no build errors
   ```
5. Sync build artefacts to the S3 frontend bucket:
   ```bash
   aws s3 sync dist/ s3://[FRONTEND_BUCKET_NAME]/ \
     --region eu-west-2 \
     --delete \
     --cache-control "public,max-age=31536000,immutable" \
     --exclude "index.html"

   # Upload index.html with no-cache to ensure SPA routing always serves latest
   aws s3 cp dist/index.html s3://[FRONTEND_BUCKET_NAME]/index.html \
     --region eu-west-2 \
     --cache-control "no-cache,no-store,must-revalidate"
   ```
6. Invalidate the CloudFront distribution cache:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id [CLOUDFRONT_DISTRIBUTION_ID] \
     --paths "/*"
   # Record InvalidationId; wait for Status: Completed
   ```
7. Verify the CloudFront URL loads the application:
   ```bash
   curl -I https://[CLOUDFRONT_DOMAIN]/
   # Expected: HTTP/2 200, x-cache: Miss from cloudfront (first hit)
   ```

**Rollback trigger:** Build fails, S3 sync errors, or CloudFront returns non-200 after invalidation → proceed to §9 Rollback Strategy (frontend rollback).

---

### Phase 4 — Post-Deployment Smoke Tests

**Objective:** Validate all critical user journeys are functional in production before declaring go-live.

**Duration estimate:** 20–30 minutes

**Dependencies:** Phases 2 and 3 complete.

**Steps:**

1. **Auth flow — signup:**
   ```bash
   curl -X POST https://{api-id}.execute-api.eu-west-2.amazonaws.com/Prod/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"smoke-test@example.com","password":"SmokeTest123!"}'
   # Expected: 200, {"message":"Sign up successful..."}
   ```
2. **Auth flow — confirm** (use code from email received at smoke-test@example.com):
   ```bash
   curl -X POST .../auth/confirm \
     -H "Content-Type: application/json" \
     -d '{"email":"smoke-test@example.com","code":"[CODE]"}'
   # Expected: 200, {"message":"Confirmation successful."}
   ```
3. **Auth flow — login and capture token:**
   ```bash
   curl -X POST .../auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"smoke-test@example.com","password":"SmokeTest123!"}'
   # Expected: 200, accessToken, idToken, refreshToken present
   # Record: ACCESS_TOKEN=[accessToken value]
   ```
4. **Document upload:**
   ```bash
   # Encode a small test PDF to base64
   BASE64=$(base64 -i test-doc.pdf)
   curl -X POST .../document/upload \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"fileContent\":\"$BASE64\",\"fileName\":\"test-doc.pdf\"}"
   # Expected: 200, {"message":"Upload successful","objectKey":"uploads/..."}
   # Record: OBJECT_KEY=[objectKey value]
   ```
5. **Flashcard generation:**
   ```bash
   curl -X POST .../flashcards/generate \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"objectKey\":\"$OBJECT_KEY\",\"ageGroup\":\"11-18\",\"cardCount\":5}"
   # Expected: 200, flashcards array with 5 items, deckId present
   # Duration: < 30 seconds
   ```
6. **Flashcard retrieval:**
   ```bash
   curl -X GET .../flashcards \
     -H "Authorization: Bearer $ACCESS_TOKEN"
   # Expected: 200, decks array containing the generated deck
   ```
7. **Frontend accessibility check:**
   - Open `https://[CLOUDFRONT_DOMAIN]` in a browser
   - Verify OpenDyslexic / Lexend font renders
   - Verify TTS "Listen" button functions
   - Verify high-contrast colour scheme is applied
8. **Security headers check:**
   ```bash
   curl -I https://[CLOUDFRONT_DOMAIN]/
   # Verify presence of: Strict-Transport-Security, Content-Security-Policy,
   # X-Frame-Options: DENY, X-XSS-Protection, X-Content-Type-Options
   ```
9. **CloudWatch alarms — confirm no alarms in ALARM state:**
   ```bash
   aws cloudwatch describe-alarms \
     --state-value ALARM \
     --region eu-west-2
   # Expected: empty AlarmList
   ```
10. **X-Ray traces — confirm traces are being recorded:**
    - Open AWS X-Ray console → Service Map → verify all four Lambda functions appear

**Rollback trigger:** Any smoke test step returns an unexpected status code, flashcard generation exceeds 30 s, or CloudWatch alarms are firing → proceed to §9 Rollback Strategy.

---

### Phase 5 — Go-Live Declaration and Hypercare

**Objective:** Formally declare the service live, communicate to stakeholders, and begin the 2-week hypercare monitoring period.

**Duration estimate:** 5–10 minutes (declaration) + 14 days (hypercare)

**Dependencies:** All Phase 4 smoke tests passed. Go/no-go sign-off obtained from all approvers.

**Steps:**

1. Conduct go/no-go call with approvers. All must confirm:
   - [ ] Smoke tests passed
   - [ ] No CloudWatch alarms firing
   - [ ] Security headers verified
   - [ ] Compliance prerequisites met (COPPA/GDPR-K)
2. Record go-live timestamp: `[GO_LIVE_TIMESTAMP]`
3. Send go-live notification (see §10 Communication Plan — Go-Live phase).
4. Enable enhanced CloudWatch monitoring for the hypercare period:
   - Set alarm evaluation periods to 1 minute (vs. 5 minutes standard)
   - Review dashboards every 4 hours for the first 48 hours
5. Clean up smoke test data:
   ```bash
   # Delete smoke test user from Cognito
   aws cognito-idp admin-delete-user \
     --user-pool-id [USER_POOL_ID] \
     --username smoke-test@example.com \
     --region eu-west-2
   ```
6. Document go-live in the revision history of this playbook and SID-DYS-001.
7. Schedule hypercare review meeting for 2026-06-07 (1 week post go-live).

**Rollback trigger:** P1 or P2 incident raised within 2 hours of go-live → invoke rollback without waiting for further investigation.


---

## 6. Environment Matrix

| Environment | Region | Tier | Purpose | Deployment Order |
|---|---|---|---|---|
| Local (dev) | N/A | Dev | Local development and unit testing | 0 — developer machines |
| Staging | eu-west-2 | Non-prod | Integration testing, UAT, security review | 1 — before production |
| Production | eu-west-2 | Prod (Tier 2) | Live service for end users | 2 — this playbook |
| DR (contingency) | eu-west-1 | Prod (standby) | Cross-region failover only; not active | 3 — on DR trigger only |

> **Note:** Staging and production are separate AWS accounts or separate CloudFormation stacks within the same account. Confirm account isolation with `aws sts get-caller-identity` before each deployment.

---

## 7. Change Management

### Change Type

**Normal Change** — This is a new service introduction (first production deployment). It requires CAB approval and follows the standard change management process per ITIL v4.

### Change Window

| Field | Value |
|---|---|
| Planned date | 2026-05-31 |
| Start time | 09:00 BST (08:00 UTC) |
| End time | 13:00 BST (12:00 UTC) |
| Total window | 4 hours |
| Maintenance notice | 48 hours in advance to stakeholders |

### CAB Approval Path

1. Change request raised in `[CHANGE_MANAGEMENT_TOOL]` by Alok Kulkarni — no later than **2026-05-28**
2. Change request reviewed by Security Reviewer and Operations Lead — **2026-05-29**
3. CAB approval obtained — **2026-05-30**
4. Deployment proceeds on **2026-05-31** within the approved change window

### Freeze Periods and Blackout Constraints

- No deployments during UK public holidays
- No deployments on Fridays after 14:00 BST (insufficient hypercare window before weekend)
- If the 2026-05-31 window is missed, the next available window is **2026-06-02** (Monday)
- Emergency changes outside this window require P1 incident declaration and emergency CAB approval

---

## 8. Risk Register

| ID | Risk / Issue | Category | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-01 | Bedrock model access not enabled in production account | Operational | Medium | Critical | Verify in Phase 1 pre-flight check; abort if not enabled | Alok Kulkarni | Open |
| R-02 | COPPA / GDPR-K compliance gap — no parental consent mechanism | Compliance | High | High | Hard prerequisite: must be implemented before go-live; deployment blocked if not complete | Alok Kulkarni | Open |
| R-03 | Bedrock cost overrun from high-volume or malicious usage | Financial / Security | Medium | High | Reserved concurrency cap (20); API throttling (50 req/s); input length cap (50k chars) | Alok Kulkarni | Mitigated |
| R-04 | PDF parsing failure for complex or scanned PDFs | Technical | Medium | Medium | UAT validation with representative document set; user-facing error message implemented | Alok Kulkarni | Open |
| R-05 | eu-west-2 regional outage causes full service unavailability | Infrastructure | Low | High | DR procedure documented (SID §14); cross-region failover to eu-west-1 if RTO exceeded | Alok Kulkarni | Accepted |
| R-06 | Sensitive personal data in uploaded documents processed by Bedrock | Data Protection | Medium | High | Privacy notice and user consent checkbox required before go-live | Alok Kulkarni | Open |
| R-07 | Lambda cold starts degrade p99 latency beyond 30 s SLO | Performance | Low | Medium | ARM64 Graviton2; keep-alive HTTP handler; monitor p99 in hypercare | Alok Kulkarni | Mitigated |
| R-08 | No automated test suite — regressions undetected | Quality | High | Medium | Hard prerequisite: unit + integration tests must pass in CI before go-live | Alok Kulkarni | Open |
| R-09 | CloudFormation change set accidentally deletes DynamoDB table | Operational | Low | Critical | Review change set carefully in Phase 2 Step 5; abort if DynamoDB replacement detected | Alok Kulkarni | Mitigated |
| R-10 | Deployment window overrun — changes not complete within 4-hour window | Operational | Low | Medium | Abort and rollback if Phase 3 not complete by T+90 min; reschedule to next window | Alok Kulkarni | Mitigated |


---

## 9. Rollback Strategy

### Trigger Conditions

Initiate rollback immediately if any of the following occur:

- CloudFormation stack reaches `ROLLBACK_COMPLETE` or `UPDATE_ROLLBACK_COMPLETE`
- Any Phase 4 smoke test fails and cannot be resolved within 15 minutes
- P1 or P2 incident raised within 2 hours of go-live declaration
- CloudWatch alarms firing on Lambda error rate > 5% or API Gateway 5xx > 1%
- Deployment window overrun: Phase 3 not complete by T+90 minutes

### Rollback Time Objective (RTO)

**30 minutes** from rollback decision to previous stable state restored.

---

### Backend Rollback (AWS SAM / CloudFormation)

For the initial production deployment (no previous stack version), rollback means deleting the stack:

```bash
# Option A: CloudFormation automatic rollback (if stack is in ROLLBACK state)
# CloudFormation will automatically revert — monitor until UPDATE_ROLLBACK_COMPLETE

# Option B: Manual stack deletion (first deployment only — no prior state to restore)
aws cloudformation delete-stack \
  --stack-name dyslexia-flashcards-prod \
  --region eu-west-2
# Wait for DELETE_COMPLETE
aws cloudformation wait stack-delete-complete \
  --stack-name dyslexia-flashcards-prod \
  --region eu-west-2
```

For subsequent deployments (previous stack version exists):

```bash
# Deploy the previous known-good SAM artefact
sam deploy \
  --stack-name dyslexia-flashcards-prod \
  --s3-bucket [SAM_ARTIFACT_BUCKET] \
  --region eu-west-2 \
  --capabilities CAPABILITY_IAM \
  --template-file [PREVIOUS_TEMPLATE_PATH]
```

**Verify rollback:**
```bash
aws cloudformation describe-stacks \
  --stack-name dyslexia-flashcards-prod \
  --region eu-west-2 \
  --query "Stacks[0].StackStatus"
# Expected: UPDATE_COMPLETE or CREATE_COMPLETE (previous version)
```

---

### Frontend Rollback (S3 + CloudFront)

```bash
# Re-sync the previous dist/ build artefact to S3
aws s3 sync [PREVIOUS_DIST_PATH]/ s3://[FRONTEND_BUCKET_NAME]/ \
  --region eu-west-2 \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

aws s3 cp [PREVIOUS_DIST_PATH]/index.html s3://[FRONTEND_BUCKET_NAME]/index.html \
  --region eu-west-2 \
  --cache-control "no-cache,no-store,must-revalidate"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id [CLOUDFRONT_DISTRIBUTION_ID] \
  --paths "/*"
```

**Verify rollback:**
```bash
curl -I https://[CLOUDFRONT_DOMAIN]/
# Expected: HTTP/2 200
```

---

### Post-Rollback Actions

1. Confirm service is stable on the previous version
2. Notify all stakeholders of rollback (see §10 Communication Plan — Rollback phase)
3. Raise a P2 incident ticket and conduct a blameless post-mortem within 48 hours
4. Document root cause and remediation in the revision history of this playbook
5. Schedule a new deployment window once root cause is resolved

---

## 10. Communication Plan

| Phase | Audience | Channel | Owner | Timing |
|---|---|---|---|---|
| Pre-deployment notice | All stakeholders, end users | Email + `[ALERT_CHANNEL]` | Alok Kulkarni | T-48 hours (2026-05-29) |
| Deployment start | Engineering team, operations | `[ALERT_CHANNEL]` | Alok Kulkarni | T-0 (09:00 BST 2026-05-31) |
| Phase 2 complete (backend live) | Engineering team | `[ALERT_CHANNEL]` | Alok Kulkarni | T+30 min |
| Phase 3 complete (frontend live) | Engineering team | `[ALERT_CHANNEL]` | Alok Kulkarni | T+45 min |
| Smoke tests passed | Engineering team, operations | `[ALERT_CHANNEL]` | Alok Kulkarni | T+75 min |
| Go-live declaration | All stakeholders, end users | Email + `[ALERT_CHANNEL]` | Alok Kulkarni | T+90 min (on success) |
| Rollback initiated | All stakeholders | Email + `[ALERT_CHANNEL]` | Alok Kulkarni | Immediately on trigger |
| Rollback complete | All stakeholders | Email + `[ALERT_CHANNEL]` | Alok Kulkarni | Within 30 min of trigger |
| Hypercare check-in (Day 1) | Engineering team, operations | `[ALERT_CHANNEL]` | Alok Kulkarni | 2026-06-01 09:00 BST |
| Hypercare review (Week 1) | All stakeholders | Meeting | Alok Kulkarni | 2026-06-07 |
| Hypercare close | All stakeholders | Email | Alok Kulkarni | 2026-06-14 |


---

## 11. Success Criteria

### Functional Checks

| Check | Expected Result | Pass |
|---|---|---|
| `POST /auth/signup` returns 200 | `{"message":"Sign up successful..."}` | [ ] |
| `POST /auth/confirm` returns 200 | `{"message":"Confirmation successful."}` | [ ] |
| `POST /auth/login` returns 200 with tokens | `accessToken`, `idToken`, `refreshToken` present | [ ] |
| `POST /document/upload` returns 200 | `{"message":"Upload successful","objectKey":"..."}` | [ ] |
| `POST /flashcards/generate` returns 200 | Flashcards array with requested card count, `deckId` present | [ ] |
| `GET /flashcards` returns 200 | `decks` array containing generated deck | [ ] |
| Frontend loads at CloudFront URL | HTTP 200, React SPA renders | [ ] |
| Dyslexia-friendly font renders | OpenDyslexic or Lexend visible in browser | [ ] |
| Text-to-speech functional | "Listen" button triggers Web Speech API | [ ] |
| Unauthenticated request to protected endpoint | HTTP 401 returned | [ ] |

### Performance Thresholds

| Metric | Threshold | Pass |
|---|---|---|
| Flashcard generation end-to-end latency | < 30 seconds | [ ] |
| Auth login response time | < 2 seconds | [ ] |
| Document upload response time (5 MB PDF) | < 10 seconds | [ ] |
| CloudFront page load (first byte) | < 500 ms | [ ] |

### SLO / Reliability Targets

| SLO | Target | Measurement |
|---|---|---|
| Availability | 99.0% | CloudWatch API Gateway 5xx rate < 1% over 1 hour post go-live |
| Lambda error rate | < 5% | CloudWatch Lambda Errors / Invocations over 5 min |
| No CloudWatch alarms in ALARM state | 0 alarms | `aws cloudwatch describe-alarms --state-value ALARM` returns empty |
| DynamoDB PITR enabled | Enabled | `PointInTimeRecoveryStatus: ENABLED` |
| X-Ray traces recording | Active | Traces visible in X-Ray Service Map for all 4 Lambda functions |

### Security Checks

| Check | Expected Result | Pass |
|---|---|---|
| `Strict-Transport-Security` header present | `max-age=63072000; includeSubDomains; preload` | [ ] |
| `X-Frame-Options` header present | `DENY` | [ ] |
| `Content-Security-Policy` header present | Non-empty CSP value | [ ] |
| `X-Content-Type-Options` header present | `nosniff` | [ ] |
| S3 frontend bucket not publicly accessible | `aws s3api get-bucket-acl` returns no public grants | [ ] |

---

## 12. Post-Deployment Validation

### Immediate (T+0 to T+2 hours)

- [ ] All smoke tests in Phase 4 passed and recorded
- [ ] CloudWatch dashboards reviewed — no anomalies
- [ ] X-Ray Service Map shows all four Lambda functions with healthy traces
- [ ] API Gateway metrics: 0 5xx errors in first 30 minutes
- [ ] Lambda metrics: 0 errors, duration within expected range
- [ ] Bedrock InvokeModel: successful invocations visible in CloudWatch logs
- [ ] DynamoDB: write and read operations confirmed via CloudWatch metrics
- [ ] CloudFront: cache hit ratio > 0% for static assets

### Hypercare Period (T+0 to T+14 days)

- [ ] Daily CloudWatch dashboard review for first 7 days
- [ ] Weekly review meeting with stakeholders (2026-06-07)
- [ ] Monitor Bedrock token usage and cost in AWS Cost Explorer daily
- [ ] Review CloudWatch Logs Insights for error patterns:
  ```
  fields @timestamp, @message
  | filter @message like /ERROR/
  | sort @timestamp desc
  | limit 50
  ```
- [ ] Confirm no P1/P2 incidents in first 7 days
- [ ] Validate user registration and flashcard generation working for real users

### Business Sign-Off

- [ ] Service Owner (Alok Kulkarni) confirms service is operating as expected
- [ ] Operations Lead confirms monitoring and alerting are functioning
- [ ] Business Stakeholder confirms user-facing functionality meets requirements
- [ ] Hypercare formally closed on 2026-06-14 with sign-off email to all stakeholders

---

## 13. Contacts and Escalation

| Role | Name | Contact | Escalation Level |
|---|---|---|---|
| Service Owner / L2 | Alok Kulkarni | [EMAIL] / [PHONE] | Primary — all incidents |
| L1 Support | [L1_CONTACT] | [EMAIL] / [PHONE] | User-facing issues |
| L3 / Infrastructure | Alok Kulkarni + AWS Support | [AWS_SUPPORT_CASE_URL] | Infrastructure / account-level |
| Security Incident | [SECURITY_REVIEWER] | [EMAIL] / [PHONE] | Security events |
| AWS Support | AWS Business/Enterprise | https://console.aws.amazon.com/support | AWS service issues |
| CAB Chair | [CAB_CHAIR] | [EMAIL] | Change management escalation |

### Escalation Path

```
User / L1 Support
      ↓ (if unresolved in 30 min)
Alok Kulkarni (L2 / Service Owner)
      ↓ (if infrastructure or security)
L3 + AWS Support
      ↓ (if P1 and unresolved in 1 hr)
Business Stakeholder notification
```

---

## 14. Approvals

| Role | Name | Signature | Date |
|---|---|---|---|
| Service Owner | Alok Kulkarni | [SIGNATURE] | [DATE] |
| Security Reviewer | [REVIEWER_NAME] | [SIGNATURE] | [DATE] |
| Operations Lead | [REVIEWER_NAME] | [SIGNATURE] | [DATE] |
| Business Stakeholder | [REVIEWER_NAME] | [SIGNATURE] | [DATE] |

---

*Playbook generated: 2026-05-26 | PLY-DYS-001 v1.0.0 | Status: Draft*
*Related documents: SID-DYS-001 · `docs/architecture.md` · `backend/template.yaml`*
