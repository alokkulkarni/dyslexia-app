# Dyslexia App — Terraform IaC

Production-grade Terraform replacement for the original `deploy.sh` / SAM-based deployment.
Manages the full AWS infrastructure as modular, version-controlled code.

## Architecture

```
terraform/
├── main.tf              # Root module — wires all modules together
├── variables.tf         # All input variables with descriptions and defaults
├── outputs.tf           # All outputs (mirrors original SAM CloudFormation outputs)
├── versions.tf          # Provider + Terraform version constraints (aws ~> 6.46)
├── terraform.tfvars     # Default production values
├── .gitignore           # Excludes state, plans, .terraform/, lambda zips
├── scripts/
│   ├── deploy.sh        # Full deploy: tf apply + frontend build + S3 upload + CF invalidation
│   └── teardown.sh      # Full teardown: disable Cognito protection + empty S3 + tf destroy
└── modules/
    ├── storage/         # S3: frontend bucket + document upload bucket
    ├── cdn/             # CloudFront distribution + OAC + security headers policy
    ├── auth/            # Cognito UserPool + UserPoolClient
    ├── database/        # DynamoDB table (PAY_PER_REQUEST, SSE, PITR)
    ├── lambda/          # All 4 Lambda functions + IAM roles + CloudWatch log groups
    └── api_gateway/     # REST API + Cognito authorizer + throttling + stage
        └── route/       # Reusable sub-module: method + Lambda integration + OPTIONS CORS
```

## AWS Resources Created

| Module | Resources |
|--------|-----------|
| storage | S3 frontend bucket (private, versioned), S3 document bucket (encrypted, lifecycle 90d) |
| cdn | CloudFront distribution, OAC (sigv4), security headers policy (HSTS/CSP/XFO) |
| auth | Cognito UserPool (deletion-protected), UserPoolClient (no secret, short-lived tokens) |
| database | DynamoDB `DyslexiaFlashcards` (userId PK + deckId SK, on-demand, PITR) |
| lambda | AuthFunction (256MB), UploadFunction (512MB), GenerateFunction (1024MB, concurrency=20), GetFlashcardsFunction (256MB) — all arm64, Node 20, X-Ray |
| api_gateway | REST API `Prod` stage, Cognito authorizer, 6 routes, throttle burst=100/rate=50, CloudWatch access logs |

## Prerequisites

- Terraform >= 1.5.0
- AWS CLI configured (`aws configure` or `AWS_PROFILE`)
- Node.js + npm (for frontend build)
- Docker (for Terraform MCP power — not required for plain Terraform usage)

## Deploy

```bash
# First time — installs backend deps, applies infra, builds + uploads frontend
./terraform/scripts/deploy.sh

# Non-interactive (CI/CD)
./terraform/scripts/deploy.sh --auto-approve
```

The deploy script replicates every step of the original `deploy.sh`:
1. Verifies AWS credentials
2. Installs backend `node_modules`
3. `terraform init && terraform plan && terraform apply`
4. Extracts outputs (API URL, bucket names, CloudFront ID)
5. Writes `frontend/.env` with `VITE_API_ENDPOINT`
6. `npm ci && npm run build` (production Vite build)
7. S3 sync with correct `Cache-Control` headers per asset type
8. CloudFront invalidation `/*`

## Teardown

```bash
./terraform/scripts/teardown.sh

# Non-interactive
./terraform/scripts/teardown.sh --auto-approve
```

Handles the pre-destroy steps Terraform can't do automatically:
1. Disables Cognito UserPool `DeletionProtection` (was `ACTIVE`)
2. Empties both S3 buckets including all object versions (versioning is enabled)
3. `terraform destroy`

## Manual Terraform Commands

```bash
cd terraform/

# Initialise (first time or after provider changes)
terraform init

# Preview changes
terraform plan

# Apply
terraform apply

# Destroy (run teardown.sh instead — it handles pre-conditions)
terraform destroy
```

## Outputs

After apply, these outputs are available via `terraform output`:

| Output | Description |
|--------|-------------|
| `api_endpoint` | API Gateway invoke URL (`https://{id}.execute-api.eu-west-2.amazonaws.com/Prod/`) |
| `frontend_bucket_name` | S3 bucket name for frontend assets |
| `cloudfront_url` | Live application URL (`https://{id}.cloudfront.net`) |
| `cloudfront_distribution_id` | CloudFront distribution ID (for cache invalidation) |
| `document_bucket_name` | S3 bucket name for user document uploads |
| `user_pool_id` | Cognito UserPool ID |
| `user_pool_client_id` | Cognito UserPoolClient ID (used by frontend auth) |
| `dynamodb_table_name` | DynamoDB table name |

## Configuration

All values are in `terraform.tfvars`. Key settings:

```hcl
aws_region  = "eu-west-2"          # London — change to redeploy in another region
stack_name  = "dyslexia-app"       # Prefix for all resource names
environment = "production"

lambda_generate_reserved_concurrency = 20   # Caps Bedrock spend
api_throttle_burst_limit             = 100
api_throttle_rate_limit              = 50
log_retention_days                   = 30
```

## Remote State (Recommended for Teams)

Add a backend block to `versions.tf` before first apply:

```hcl
terraform {
  backend "s3" {
    bucket         = "your-tfstate-bucket"
    key            = "dyslexia-app/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}
```

## Security Notes

- All S3 buckets have public access fully blocked
- CloudFront uses OAC (sigv4) — no legacy OAI
- Security headers: HSTS (2yr), CSP, X-Frame-Options DENY, XSS protection
- Cognito tokens: 60min access/ID, 30d refresh, revocation enabled
- GenerateFunction concurrency capped at 20 (prevents Bedrock cost exhaustion)
- IAM roles follow least-privilege per function
- DynamoDB encrypted at rest + PITR enabled
- API Gateway throttling on all routes
