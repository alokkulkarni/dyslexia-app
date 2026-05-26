# Service Introduction Document

## 1. Document Control

| Field | Value |
|---|---|
| **SID ID** | SID-DYS-001 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Classification** | Internal |
| **Owner** | Alok Kulkarni |
| **Reviewers** | [REVIEWER_NAME], [REVIEWER_NAME] |
| **Created** | 2026-05-26 |
| **Last Updated** | 2026-05-26 |

### Revision History

| Version | Date | Author | Summary of Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-26 | Alok Kulkarni | Initial draft |

---

## 2. Executive Summary

The Dyslexia Flashcards App is a serverless, AI-powered web application designed to improve literacy outcomes for individuals with dyslexia aged 6–18. The service enables users to upload educational documents (PDF or plain text) and automatically generates personalised, age-appropriate flashcards using Amazon Bedrock's Claude 3 Haiku foundation model. Flashcards are presented through an accessible, gamified interface that incorporates dyslexia-friendly typography, high-contrast colour schemes, and text-to-speech capabilities.

The service addresses a significant gap in accessible educational tooling by combining generative AI with evidence-based dyslexia accommodations. It delivers measurable value through reduced friction in study material creation, increased learner engagement via gamification mechanics (points, streaks, avatar unlocks), and cost-efficient serverless infrastructure that scales to zero when idle. The intended audience for this document includes engineering teams, operations staff, security reviewers, and business stakeholders responsible for approving the service's transition into production.

---

## 3. Service Description

| Field | Value |
|---|---|
| **Service Name** | Dyslexia Flashcards App |
| **Classification** | Internal |
| **Service Tier** | 2 – Business Important |
| **Service Type** | New |
| **Category** | AI-Powered Educational Tool |
| **Business Unit** | Product / Platform Engineering |
| **Primary Region** | eu-west-2 (London) |
| **Runtime** | AWS Serverless (Lambda, API Gateway, DynamoDB, S3, Bedrock, Cognito, CloudFront) |


---

## 4. Business Context

### Business Drivers

1. **Improve literacy outcomes for dyslexic children aged 6–18** — Dyslexia affects approximately 10–15% of the population; accessible, personalised study tools are scarce and expensive. This service democratises AI-assisted learning.
2. **Reduce time-to-study-material for educators and parents** — Manually creating dyslexia-friendly flashcards from textbooks or worksheets is time-consuming. Automated generation reduces this from hours to seconds.
3. **Demonstrate cost-efficient AI product delivery** — The fully serverless architecture proves that production-grade AI applications can be built and operated at near-zero idle cost, validating the platform engineering team's serverless-first strategy.

### Stakeholders & Personas

| Persona | Role | Interest |
|---|---|---|
| Alok Kulkarni | Service Owner / Engineer | Delivery, architecture, and operational responsibility |
| End User (Child, 6–10) | Primary consumer | Simple, readable flashcards from school documents |
| End User (Student, 11–18) | Primary consumer | Conceptual flashcards for exam preparation |
| Parent / Guardian | Secondary consumer | Monitors progress; uploads documents on behalf of child |
| Educator / Teacher | Secondary consumer | Uploads class materials; reviews generated decks |
| Operations Team | Internal | Monitoring, incident response, cost governance |
| Security Reviewer | Internal | Compliance, data protection, vulnerability management |

### Business Value Metrics

| Metric | Target |
|---|---|
| Flashcard generation time | < 30 seconds per document |
| Cost per flashcard generation | < $0.01 USD |
| Monthly idle infrastructure cost | $0 (serverless, pay-per-use) |
| User engagement (daily streak retention) | > 40% week-2 retention |

---

## 5. Service Scope

### In-Scope

- User registration, email verification, and authentication via Amazon Cognito
- Document upload (PDF and TXT, max 10 MB) via authenticated REST API
- AI-powered flashcard generation using Amazon Bedrock (Claude 3 Haiku)
- Age-group-aware prompt engineering (6–10 and 11–18 profiles)
- Flashcard persistence and retrieval from Amazon DynamoDB
- Gamification layer: points, daily streaks, avatar unlocks (frontend)
- Accessible UI: OpenDyslexic / Lexend font, high-contrast palette, text-to-speech (Web Speech API)
- Static frontend hosting via Amazon S3 + CloudFront (global CDN)
- Infrastructure-as-Code deployment via AWS SAM

### Out-of-Scope

- Native mobile applications (iOS / Android)
- Real-time collaborative editing of flashcard decks
- Integration with third-party LMS platforms (e.g. Moodle, Canvas)
- Support for documents larger than 10 MB or formats other than PDF/TXT
- Video or audio content ingestion
- Offline / PWA mode
- Multi-region active-active deployment (single region: eu-west-2)

### Service Boundaries

The service boundary begins at the CloudFront distribution (public HTTPS entry point) and ends at the Amazon Bedrock API and DynamoDB table. All data remains within the AWS eu-west-2 region. The service does not integrate with any on-premises systems or third-party data processors beyond Amazon Bedrock (Anthropic Claude 3 Haiku, operated by AWS).


---

## 6. Technical Architecture

### Architecture Overview

The service is a fully serverless, event-driven application deployed on AWS in the eu-west-2 (London) region. The frontend is a React 19 single-page application (SPA) built with Vite, served from Amazon S3 via Amazon CloudFront with strict security response headers (CSP, HSTS, X-Frame-Options). All API traffic is authenticated via Amazon Cognito JWT tokens validated at the API Gateway layer.

The backend consists of four AWS Lambda functions (Node.js 20.x, ARM64/Graviton2) exposed through a single Amazon API Gateway REST API. Document uploads are stored in a private S3 bucket with server-side AES-256 encryption. Flashcard generation is handled by invoking Amazon Bedrock's Claude 3 Haiku model via the `InvokeModel` API. Generated flashcards are persisted to Amazon DynamoDB (on-demand billing, encryption at rest, PITR enabled).

```
Browser → CloudFront → S3 (static assets)
Browser → API Gateway (Cognito JWT auth) → Lambda (auth / upload / generate / flashcards)
Lambda (generate) → S3 (document read) → Bedrock (Claude 3 Haiku) → DynamoDB (write)
Lambda (flashcards) → DynamoDB (read)
```

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 19.x |
| Frontend Build Tool | Vite | 8.x |
| Frontend Fonts | Lexend (@fontsource), OpenDyslexic (CDN) | 5.x |
| Backend Runtime | Node.js on AWS Lambda | 20.x (ARM64) |
| IaC | AWS SAM | 2016-10-31 |
| API Layer | Amazon API Gateway (REST) | — |
| Auth | Amazon Cognito User Pool | — |
| AI / ML | Amazon Bedrock – Claude 3 Haiku | anthropic.claude-3-haiku-20240307-v1:0 |
| Database | Amazon DynamoDB (on-demand) | — |
| Object Storage | Amazon S3 (2 buckets: frontend, documents) | — |
| CDN | Amazon CloudFront | — |
| PDF Parsing | pdf-parse | 2.4.5 |
| AWS SDK | @aws-sdk v3 | 3.1050.x |
| HTTP Keep-Alive | @smithy/node-http-handler | 4.x |
| Observability | AWS X-Ray (active tracing on all functions) | — |

### Integration Points

| Integration | Direction | Protocol | Auth |
|---|---|---|---|
| Amazon Cognito | Outbound (Lambda → Cognito) | AWS SDK v3 | IAM Role |
| Amazon Bedrock (Claude 3 Haiku) | Outbound (Lambda → Bedrock) | AWS SDK v3 / HTTPS | IAM Role (bedrock:InvokeModel) |
| Amazon DynamoDB | Outbound (Lambda → DynamoDB) | AWS SDK v3 | IAM Role |
| Amazon S3 (documents) | Outbound (Lambda → S3) | AWS SDK v3 | IAM Role |
| Amazon S3 (frontend) | Inbound (CloudFront → S3) | HTTPS / OAC sigv4 | CloudFront OAC |
| API Gateway | Inbound (Browser → APIGW) | HTTPS REST | Cognito JWT |


---

## 7. Service Interfaces

### APIs / Contracts

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | None | Register a new user (email + password) |
| POST | `/auth/confirm` | None | Confirm email with verification code |
| POST | `/auth/login` | None | Authenticate and return JWT tokens |
| POST | `/document/upload` | Cognito JWT | Upload a PDF or TXT document (base64, max 10 MB) |
| POST | `/flashcards/generate` | Cognito JWT | Generate flashcards from an uploaded document or raw text |
| GET | `/flashcards` | Cognito JWT | Retrieve all flashcard decks for the authenticated user |

All endpoints are served under: `https://{api-id}.execute-api.eu-west-2.amazonaws.com/Prod/`

### Event / Message Interfaces

The service does not currently publish or consume asynchronous events or message queues. All interactions are synchronous request/response over HTTPS.

### UI Interfaces

| Interface | Technology | URL |
|---|---|---|
| Web Application (SPA) | React 19 + Vite, served via CloudFront | `https://{cloudfront-domain}` |
| Accessibility Features | OpenDyslexic font, Lexend font, Web Speech API TTS, high-contrast CSS | Embedded in SPA |

---

## 8. Service Dependencies

### Internal Dependencies

| Dependency | Type | Criticality | Notes |
|---|---|---|---|
| AWS SAM Stack | IaC / Deployment | Critical | Provisions all AWS resources |
| FlashcardsTable (DynamoDB) | Data store | Critical | Stores all user decks and progress |
| DocumentBucket (S3) | Object storage | Critical | Stores uploaded user documents |
| FrontendBucket (S3) | Object storage | Critical | Hosts compiled React SPA assets |
| FrontendDistribution (CloudFront) | CDN | Critical | Global delivery of frontend assets |

### External Dependencies

| Dependency | Version / Tier | Owner | Criticality | Notes |
|---|---|---|---|---|
| Amazon Cognito | AWS Managed | AWS | Critical | User authentication and JWT issuance |
| Amazon Bedrock (Claude 3 Haiku) | anthropic.claude-3-haiku-20240307-v1:0 | AWS / Anthropic | Critical | AI flashcard generation; requires model access enabled in console |
| Amazon API Gateway | AWS Managed | AWS | Critical | REST API routing and Cognito authorizer |
| AWS Lambda | Node.js 20.x ARM64 | AWS | Critical | All backend compute |
| AWS X-Ray | AWS Managed | AWS | Low | Distributed tracing |
| @aws-sdk/client-bedrock-runtime | 3.1050.x | AWS | Critical | Bedrock API client |
| pdf-parse | 2.4.5 | npm (open source) | High | PDF text extraction in Lambda |
| @fontsource/lexend | 5.x | npm (open source) | Low | Accessible font for frontend |


---

## 9. Service Level Objectives

| SLO | Target | Notes |
|---|---|---|
| **Availability** | 99.0% | ~87.6 hrs downtime/year; inherits AWS Lambda / API GW SLA |
| **Latency p50** | < 3 s | End-to-end flashcard generation (typical document) |
| **Latency p95** | < 15 s | Includes Bedrock inference time for larger documents |
| **Latency p99** | < 30 s | Lambda timeout ceiling; Bedrock cold-start included |
| **Throughput** | 50 req/s sustained, 100 req/s burst | API Gateway throttle limits configured in SAM template |
| **RTO** | 4 hours | Time to restore service after a major incident |
| **RPO** | 4 hours | Maximum acceptable data loss; DynamoDB PITR enabled |
| **Flashcard generation cost** | < $0.01 USD per request | Based on Claude 3 Haiku pricing at ~500 input / 400 output tokens |

---

## 10. Operational Model

### Support Tiers

| Tier | Scope | Contact | Response Time |
|---|---|---|---|
| L1 | User-facing issues: login failures, UI errors, flashcard display problems | [L1_CONTACT] | < 4 hours (business hours) |
| L2 | API errors, Lambda failures, DynamoDB query issues, Bedrock errors | Alok Kulkarni | < 2 hours |
| L3 | Infrastructure, SAM stack, AWS account-level issues, security incidents | Alok Kulkarni + AWS Support | < 1 hour |

### On-Call Model

- **Primary on-call**: Alok Kulkarni
- **Escalation path**: L2 → L3 → AWS Support (Business/Enterprise tier)
- **On-call rotation**: Single owner (pre-production); rotation to be established post go-live
- **Alerting channel**: AWS CloudWatch Alarms → [ALERT_CHANNEL]

### Incident Classification

| Severity | Definition | Example | Response SLA |
|---|---|---|---|
| P1 – Critical | Full service outage; no users can access the app | CloudFront down, API Gateway 5xx > 50% | 15 min acknowledgement, 1 hr resolution target |
| P2 – High | Core feature broken; flashcard generation failing | Bedrock InvokeModel errors, Lambda timeout | 30 min acknowledgement, 4 hr resolution target |
| P3 – Medium | Degraded performance or partial feature failure | Slow generation (> 30 s), auth intermittent | 2 hr acknowledgement, 8 hr resolution target |
| P4 – Low | Cosmetic or non-blocking issues | Font not loading, minor UI glitch | Next business day |


---

## 11. Security and Compliance

### Security Classification

**Internal** — The service processes personal data (email addresses, uploaded educational documents) belonging to users who may be minors. Data is classified as sensitive personal data under GDPR.

### Authentication and Authorisation

| Mechanism | Implementation |
|---|---|
| User Authentication | Amazon Cognito User Pool; email + password; email verification required |
| Password Policy | Min 10 chars, uppercase, lowercase, numbers enforced |
| Token Type | JWT (Access Token, ID Token, Refresh Token) |
| Token Validity | Access/ID: 60 minutes; Refresh: 30 days |
| API Authorisation | Cognito JWT authorizer on all protected API Gateway routes |
| CORS | Restricted to CloudFront origin only (dynamic, not wildcard) |
| Object-level access | S3 keys scoped to `uploads/{userId}/` prefix; path traversal validation enforced in Lambda |

### Security Controls

| Control | Implementation |
|---|---|
| Transport Security | HTTPS enforced everywhere; HSTS max-age 63072000 with preload |
| Content Security Policy | Strict CSP header via CloudFront ResponseHeadersPolicy |
| Clickjacking Protection | `X-Frame-Options: DENY` |
| XSS Protection | `X-XSS-Protection: 1; mode=block` |
| S3 Public Access | Blocked on all buckets (BlockPublicAcls, BlockPublicPolicy) |
| S3 Encryption | AES-256 server-side encryption on document bucket |
| DynamoDB Encryption | SSE enabled at rest |
| Lambda Concurrency Cap | GenerateFunction: max 20 concurrent executions (cost and DoS protection) |
| API Throttling | 50 req/s rate, 100 req/s burst per stage |
| Error Masking | Internal error details never returned to clients (CVE-11 pattern) |
| Username Enumeration | Cognito error codes mapped to generic messages |
| File Type Validation | Whitelist: PDF and TXT only; extension and content-type validated |
| File Size Limit | 10 MB maximum upload size enforced in Lambda |

### Data Classification

| Data Type | Classification | Storage | Retention |
|---|---|---|---|
| User email address | Personal Data (GDPR) | Cognito User Pool, DynamoDB | Until account deletion |
| Uploaded documents | Potentially sensitive (educational content) | S3 (encrypted) | [DEFINE_RETENTION_POLICY] |
| Generated flashcards | User-generated content | DynamoDB (encrypted) | Until user deletion |
| JWT tokens | Authentication credential | Client-side only (memory) | 60 min (access), 30 days (refresh) |
| CloudWatch logs | Operational | CloudWatch Logs | [DEFINE_LOG_RETENTION] |

### Regulatory Requirements

| Framework | Applicability | Notes |
|---|---|---|
| GDPR | High | Processes personal data of EU/UK users; users may be minors — parental consent mechanisms required pre-production |
| HIPAA | Medium | No PHI currently processed; if educational documents contain health information, BAA with AWS required |
| ISO 27001 | Target | AWS infrastructure is ISO 27001 certified; application-level controls to be audited |
| SOC 2 Type II | Target | AWS services are SOC 2 compliant; application audit required for full certification |
| COPPA / GDPR-K | High | Service targets children under 13; age-gating and parental consent flows must be implemented before go-live |


---

## 12. Capacity and Scalability

### Current Capacity Metrics

| Resource | Configuration | Limit |
|---|---|---|
| Lambda (GenerateFunction) | 1024 MB, 60 s timeout, ARM64 | 20 concurrent executions (reserved) |
| Lambda (AuthFunction) | 256 MB, 30 s timeout, ARM64 | Account default concurrency |
| Lambda (UploadFunction) | 512 MB, 30 s timeout, ARM64 | Account default concurrency |
| Lambda (GetFlashcardsFunction) | 256 MB, 30 s timeout, ARM64 | Account default concurrency |
| API Gateway | 50 req/s rate, 100 req/s burst | AWS account quota |
| DynamoDB | On-demand (PAY_PER_REQUEST) | No pre-provisioned limit |
| S3 | Standard storage class | No practical limit |
| Bedrock (Claude 3 Haiku) | On-demand invocation | AWS Bedrock service quotas |
| Document size | 10 MB max per upload | Enforced in Lambda |
| Text processing | 50,000 characters per generation | Enforced in Lambda (substring truncation) |

### Scaling Approach

The service is fully serverless and scales automatically with demand. Lambda scales horizontally per invocation up to the reserved concurrency limit on GenerateFunction (20) to prevent runaway Bedrock costs. DynamoDB on-demand mode scales read/write capacity automatically. CloudFront handles global traffic distribution with edge caching for static assets.

For significant traffic growth (> 100 concurrent users), the following adjustments are recommended:
- Increase GenerateFunction reserved concurrency
- Enable DynamoDB auto-scaling or switch to provisioned capacity with Application Auto Scaling
- Consider Amazon SQS queue in front of GenerateFunction to smooth burst traffic

### Known Limits

| Limit | Value | Mitigation |
|---|---|---|
| Max flashcards per generation | 100 | Enforced server-side |
| Max document size | 10 MB | Enforced in upload Lambda |
| Max text processed per generation | 50,000 characters | Truncated in generate Lambda |
| Max decks returned per user | 500 | Paginated DynamoDB query cap |
| Bedrock max_tokens per request | 4,096 | Scaled proportionally to card count |
| Lambda cold start (ARM64) | ~200–500 ms | Mitigated by keep-alive HTTP handler |

---

## 13. Monitoring and Observability

### Key Metrics

| Metric | Source | Alert Threshold |
|---|---|---|
| Lambda error rate | CloudWatch (Errors / Invocations) | > 5% over 5 min → P2 |
| Lambda duration p99 | CloudWatch | > 25 s → P3 |
| Lambda throttles | CloudWatch | > 0 over 1 min → P3 |
| API Gateway 5xx rate | CloudWatch | > 1% over 5 min → P2 |
| API Gateway 4xx rate | CloudWatch | > 10% over 5 min → P3 |
| DynamoDB consumed RCU/WCU | CloudWatch | > 80% of provisioned → P3 |
| Bedrock InvokeModel errors | CloudWatch (Lambda logs) | Any error → P2 |
| CloudFront error rate | CloudWatch | > 5% over 5 min → P2 |
| S3 upload failures | CloudWatch (Lambda logs) | Any 5xx → P3 |

### Logging Strategy

- All Lambda functions emit structured JSON logs to Amazon CloudWatch Logs
- Log groups: `/aws/lambda/{FunctionName}`
- X-Ray active tracing enabled on all functions for distributed trace correlation
- Sensitive data (passwords, tokens, document content) is never logged
- Error details are logged server-side but never returned to clients

### Alerting Thresholds

See Key Metrics table above. Alerts are configured via CloudWatch Alarms and routed to `[ALERT_CHANNEL]`.

### Dashboard Links

| Dashboard | URL |
|---|---|
| CloudWatch Lambda Overview | `[CLOUDWATCH_DASHBOARD_URL]` |
| X-Ray Service Map | `[XRAY_SERVICE_MAP_URL]` |
| API Gateway Metrics | `[APIGW_METRICS_URL]` |


---

## 14. Disaster Recovery and Business Continuity

### DR Strategy

The service relies on AWS managed services with built-in high availability. All stateful data is protected as follows:

- **DynamoDB**: Point-in-Time Recovery (PITR) enabled — data can be restored to any second within the last 35 days
- **S3 (documents)**: Standard storage class with 99.999999999% (11 nines) durability; versioning can be enabled if required
- **S3 (frontend)**: Static assets are rebuilt from source and redeployed via SAM; no backup required
- **Cognito**: AWS-managed; user pool data is replicated by AWS within the region
- **Lambda / API Gateway**: Stateless; redeployment via `sam deploy` restores compute layer

### RTO / RPO Targets

| Target | Value |
|---|---|
| RTO | 4 hours |
| RPO | 4 hours |

### Failover Approach

The service is single-region (eu-west-2). In the event of a regional AWS outage:

1. Declare incident and notify stakeholders
2. Assess AWS Service Health Dashboard for estimated recovery time
3. If outage exceeds RTO, evaluate cross-region failover to eu-west-1 (Ireland) using SAM stack redeployment
4. Restore DynamoDB data from PITR backup in target region
5. Update CloudFront origin to point to new API Gateway endpoint
6. Validate service health and communicate restoration

A formal multi-region DR runbook should be created before go-live if Tier 1 SLAs are required in future.

---

## 15. Service Transition Plan

### Transition Phases

| Phase | Description | Owner | Target Date |
|---|---|---|---|
| 1. Development Complete | All Lambda functions, frontend, and SAM template finalised | Alok Kulkarni | 2026-05-20 |
| 2. Security Review | Penetration test, GDPR/COPPA assessment, IAM policy review | [SECURITY_REVIEWER] | 2026-05-25 |
| 3. Staging Deployment | Deploy to staging AWS account; end-to-end integration testing | Alok Kulkarni | 2026-05-27 |
| 4. UAT | User acceptance testing with representative users (including dyslexic users aged 6–18) | [UAT_LEAD] | 2026-05-29 |
| 5. Go-Live | Production deployment via `sam deploy`; DNS / CloudFront cutover | Alok Kulkarni | 2026-05-31 |
| 6. Hypercare | 2-week intensive monitoring post go-live | Alok Kulkarni | 2026-06-14 |

### Acceptance Criteria

- [ ] All six API endpoints return correct responses in staging
- [ ] Flashcard generation completes within 30 seconds for a 5-page PDF
- [ ] Cognito authentication flow (signup → confirm → login) works end-to-end
- [ ] CloudFront serves the React SPA with correct security headers
- [ ] DynamoDB PITR is enabled and a test restore has been validated
- [ ] CloudWatch alarms are configured and tested
- [ ] GDPR privacy notice and consent mechanism are in place
- [ ] COPPA age-gating or parental consent flow is implemented
- [ ] Accessibility audit passed (OpenDyslexic font, contrast ratio ≥ 4.5:1, TTS functional)
- [ ] Load test: 20 concurrent flashcard generation requests complete without throttle errors

### Go-Live Checklist

- [ ] AWS SAM stack deployed to production account
- [ ] Cognito User Pool client ID configured in frontend `.env`
- [ ] CloudFront distribution enabled and default root object set to `index.html`
- [ ] API Gateway throttle limits confirmed (50 req/s rate, 100 burst)
- [ ] Lambda reserved concurrency set on GenerateFunction (20)
- [ ] CloudWatch alarms active and routed to on-call channel
- [ ] X-Ray tracing confirmed active on all functions
- [ ] Bedrock model access enabled in AWS console (Claude 3 Haiku, eu-west-2)
- [ ] Rollback plan documented and tested (previous SAM stack version)
- [ ] Stakeholder go/no-go sign-off obtained


---

## 16. Training and Knowledge Transfer

### Training Requirements

| Audience | Training Required | Format |
|---|---|---|
| Operations / L2 Support | AWS Lambda, DynamoDB, CloudWatch, SAM deployment | Self-paced + walkthrough session |
| L1 Support | Common user issues, escalation paths, incident classification | Written runbook |
| New Engineers | Architecture overview, local dev setup, SAM deploy workflow | Onboarding doc + pair session |
| End Users (Parents / Educators) | How to upload documents, generate flashcards, use gamification features | In-app onboarding tour |

### Documentation Links

| Document | Location |
|---|---|
| Architecture Overview | `docs/architecture.md` |
| Implementation Plan | `docs/implementation_plan.md` |
| Scaffolding Walkthrough | `docs/walkthrough.md` |
| SAM Template | `backend/template.yaml` |
| Frontend README | `frontend/README.md` |
| This SID | `docs/service-introduction/dyslexia-flashcards-sid.md` |

### Knowledge Transfer Plan

1. Architecture walkthrough session with operations team (1 hour) — scheduled before go-live
2. Incident response runbook to be authored by Alok Kulkarni and reviewed by L2/L3 contacts
3. Deployment runbook (`sam build && sam deploy`) to be documented in `docs/`
4. Post go-live: record a 15-minute Loom walkthrough of the full system for async onboarding

---

## 17. Risk Register

| ID | Risk / Issue | Category | Probability | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-01 | Bedrock model access not enabled in production AWS account before go-live | Operational | Medium | Critical | Add Bedrock model access enablement to go-live checklist; verify in staging | Alok Kulkarni | Open |
| R-02 | COPPA / GDPR-K compliance gap — no parental consent mechanism for users under 13 | Compliance | High | High | Implement age-gating and parental consent flow before go-live; legal review required | Alok Kulkarni | Open |
| R-03 | Bedrock cost overrun due to high-volume usage or prompt injection attacks | Financial / Security | Medium | High | Reserved concurrency cap (20) on GenerateFunction; API throttling; input length cap (50k chars) | Alok Kulkarni | Mitigated |
| R-04 | PDF parsing failure for complex or scanned PDFs (pdf-parse limitation) | Technical | Medium | Medium | Validate with representative document set in UAT; add user-facing error message for unsupported PDFs | Alok Kulkarni | Open |
| R-05 | Single-region deployment — eu-west-2 outage causes full service unavailability | Infrastructure | Low | High | Document cross-region failover procedure; evaluate multi-region for Tier 1 upgrade | Alok Kulkarni | Accepted |
| R-06 | User-uploaded documents may contain sensitive personal data (medical, financial) | Data Protection | Medium | High | Privacy notice must clearly state document content is processed by AWS Bedrock (Anthropic Claude); add user consent checkbox | Alok Kulkarni | Open |
| R-07 | Lambda cold starts degrade p99 latency beyond 30 s SLO | Performance | Low | Medium | ARM64 Graviton2 reduces cold start; keep-alive HTTP handler reuses connections; monitor p99 in CloudWatch | Alok Kulkarni | Mitigated |
| R-08 | No automated test suite — regressions may go undetected | Quality | High | Medium | Implement unit tests for Lambda handlers and integration tests for API endpoints before go-live | Alok Kulkarni | Open |

---

## 18. Approvals

| Role | Name | Signature | Date |
|---|---|---|---|
| Service Owner | Alok Kulkarni | [SIGNATURE] | [DATE] |
| Security Reviewer | [REVIEWER_NAME] | [SIGNATURE] | [DATE] |
| Operations Lead | [REVIEWER_NAME] | [SIGNATURE] | [DATE] |
| Business Stakeholder | [REVIEWER_NAME] | [SIGNATURE] | [DATE] |

---

*Document generated: 2026-05-26 | SID-DYS-001 v1.0.0 | Status: Draft*
