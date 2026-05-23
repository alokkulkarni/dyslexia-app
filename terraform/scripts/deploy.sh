#!/bin/bash
# ── Terraform-based Production Deployment ───────────────────────────────────
# Replicates every step of the original deploy.sh using Terraform for IaC.
#
# Usage:
#   ./terraform/scripts/deploy.sh [--auto-approve]
#
# Prerequisites:
#   - terraform >= 1.5.0
#   - aws CLI configured with valid credentials
#   - node / npm installed (for frontend build)
#   - backend/src/node_modules present (run: cd backend/src && npm ci)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TF_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$TF_DIR/.." && pwd)"
AUTO_APPROVE="${1:-}"

export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-eu-west-2}"

# ── Helpers ──────────────────────────────────────────────────────────────────

log()  { echo "  $*"; }
step() { echo ""; echo "── $* ──────────────────────────────────────────────"; }

check_aws_creds() {
    step "Verifying AWS credentials"
    if ! aws sts get-caller-identity --query "Account" --output text > /dev/null 2>&1; then
        echo "❌ No valid AWS credentials. Run 'aws configure' or set AWS_PROFILE."
        exit 1
    fi
    log "✅ Credentials OK (account: $(aws sts get-caller-identity --query Account --output text))"
}

check_deps() {
    step "Checking dependencies"
    for cmd in terraform aws node npm; do
        if ! command -v "$cmd" &>/dev/null; then
            echo "❌ Required command not found: $cmd"
            exit 1
        fi
    done
    log "✅ terraform $(terraform version -json | python3 -c 'import sys,json; print(json.load(sys.stdin)["terraform_version"])' 2>/dev/null || terraform version | head -1)"
    log "✅ aws $(aws --version 2>&1 | cut -d' ' -f1)"
    log "✅ node $(node --version)"
}

# ── Step 1: Install backend dependencies ─────────────────────────────────────

install_backend_deps() {
    step "Installing backend dependencies"
    cd "$ROOT_DIR/backend/src"
    npm ci --no-progress
    log "✅ Backend node_modules ready"
    cd "$TF_DIR"
}

# ── Step 2: Terraform init + apply ───────────────────────────────────────────

terraform_apply() {
    step "Running terraform init"
    cd "$TF_DIR"
    terraform init -upgrade

    step "Running terraform plan"
    terraform plan -out=tfplan

    step "Applying infrastructure"
    if [ "$AUTO_APPROVE" = "--auto-approve" ]; then
        terraform apply -auto-approve tfplan
    else
        terraform apply tfplan
    fi
    rm -f tfplan
}

# ── Step 3: Extract outputs ───────────────────────────────────────────────────

extract_outputs() {
    step "Extracting Terraform outputs"
    cd "$TF_DIR"
    API_URL=$(terraform output -raw api_endpoint)
    FRONTEND_BUCKET=$(terraform output -raw frontend_bucket_name)
    CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
    CLOUDFRONT_ID=$(terraform output -raw cloudfront_distribution_id)

    log "API Gateway URL : $API_URL"
    log "Frontend Bucket : $FRONTEND_BUCKET"
    log "CloudFront URL  : $CLOUDFRONT_URL"
}

# ── Step 4: Build frontend ────────────────────────────────────────────────────

build_frontend() {
    step "Building frontend (production)"
    cd "$ROOT_DIR/frontend"

    # Write the env file Vite reads at build time — same as original deploy.sh
    echo "VITE_API_ENDPOINT=$API_URL" > .env
    log "Wrote .env: VITE_API_ENDPOINT=$API_URL"

    npm ci --no-progress
    NODE_ENV=production npm run build
    log "✅ Frontend built → dist/"
}

# ── Step 5: Upload to S3 with cache strategy ──────────────────────────────────
# Mirrors the four-step cache strategy from the original deploy.sh exactly.

upload_frontend() {
    step "Uploading frontend to S3"

    # Step A: full sync — establishes file set, removes stale files
    aws s3 sync "$ROOT_DIR/frontend/dist/" "s3://$FRONTEND_BUCKET/" \
        --delete \
        --no-progress

    # Step B: hashed JS/CSS bundles → immutable (1 year)
    aws s3 sync "$ROOT_DIR/frontend/dist/assets/" "s3://$FRONTEND_BUCKET/assets/" \
        --cache-control "max-age=31536000, immutable" \
        --no-progress

    # Step C: fonts → immutable (1 year)
    if [ -d "$ROOT_DIR/frontend/dist/fonts" ]; then
        aws s3 sync "$ROOT_DIR/frontend/dist/fonts/" "s3://$FRONTEND_BUCKET/fonts/" \
            --cache-control "max-age=31536000, immutable" \
            --no-progress
    fi

    # Step D: index.html → never cached
    aws s3 cp "$ROOT_DIR/frontend/dist/index.html" "s3://$FRONTEND_BUCKET/index.html" \
        --cache-control "no-cache, no-store, must-revalidate" \
        --content-type "text/html; charset=utf-8" \
        --no-progress

    log "✅ Frontend uploaded to s3://$FRONTEND_BUCKET/"
}

# ── Step 6: Invalidate CloudFront ─────────────────────────────────────────────

invalidate_cloudfront() {
    step "Invalidating CloudFront cache"
    if [ -n "${CLOUDFRONT_ID:-}" ] && [ "$CLOUDFRONT_ID" != "None" ]; then
        INVALIDATION_ID=$(aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_ID" \
            --paths "/*" \
            --query "Invalidation.Id" \
            --output text)
        log "Invalidation ID: $INVALIDATION_ID (propagating in ~30 s)"
    else
        log "⚠️  No CloudFront distribution ID found — skipping invalidation"
    fi
}

# ── Main ──────────────────────────────────────────────────────────────────────

echo ""
echo "🚀 Dyslexia App — Terraform Production Deployment"
echo "=================================================="

check_aws_creds
check_deps
install_backend_deps
terraform_apply
extract_outputs
build_frontend
upload_frontend
invalidate_cloudfront

echo ""
echo "✅ Production Deployment Complete!"
echo "==========================================="
echo "🌐 Live Application : $CLOUDFRONT_URL"
echo "🔌 API Endpoint     : $API_URL"
echo "==========================================="
