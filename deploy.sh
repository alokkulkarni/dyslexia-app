#!/bin/bash

# Dyslexia App — Production Deployment Script
set -euo pipefail

STACK_NAME="dyslexia-app-stack"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Suppress SAM CLI telemetry pings on every invocation
export SAM_CLI_TELEMETRY=0
# Default region guard — override by setting AWS_DEFAULT_REGION in your shell
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-eu-west-2}"

# ── Helpers ────────────────────────────────────────────────────────────────

check_aws_creds() {
    echo "🔐 Verifying AWS credentials…"
    if ! aws sts get-caller-identity --query "Account" --output text > /dev/null 2>&1; then
        echo "❌ No valid AWS credentials found. Run 'aws configure' or set AWS_PROFILE."
        exit 1
    fi
    echo "   ✅ Credentials OK (account: $(aws sts get-caller-identity --query Account --output text))"
}

# ── Deploy ──────────────────────────────────────────────────────────────────

deploy() {
    echo "🚀 Starting Production Deployment of Dyslexia App…"

    check_aws_creds

    # ── 1. Build & deploy backend ─────────────────────────────────────────
    echo ""
    echo "📦 Building Backend…"
    cd "$SCRIPT_DIR/backend"
    sam validate
    sam build --no-cached

    echo "☁️  Deploying Backend Stack ($STACK_NAME)…"
    sam deploy \
        --stack-name "$STACK_NAME" \
        --resolve-s3 \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --no-fail-on-empty-changeset \
        --no-progressbar

    # ── 2. Extract stack outputs ──────────────────────────────────────────
    echo ""
    echo "🔍 Extracting CloudFormation Outputs…"
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
        --output text)
    FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
        --output text)
    CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontUrl'].OutputValue" \
        --output text)
    CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
        --output text)

    echo "   API Gateway URL : $API_URL"
    echo "   Frontend Bucket : $FRONTEND_BUCKET"
    echo "   CloudFront URL  : $CLOUDFRONT_URL"

    # ── 3. Build frontend ─────────────────────────────────────────────────
    echo ""
    echo "💻 Building Frontend (production)…"
    cd "$SCRIPT_DIR/frontend"

    # Write the env file Vite reads at build time
    echo "VITE_API_ENDPOINT=$API_URL" > .env

    npm ci --no-progress
    NODE_ENV=production npm run build

    # ── 4. Upload to S3 with correct Cache-Control headers ───────────────
    # Strategy:
    #   • dist/assets/  — content-hashed filenames → immutable (1 year)
    #   • dist/fonts/   — stable font filenames    → immutable (1 year)
    #   • dist/index.html                          → no-cache  (always fresh)
    #   • everything else (favicon, manifest…)     → 1-day cache
    echo ""
    echo "⬆️  Uploading Frontend to S3…"

    # Step A: full sync (establishes file set, removes stale files)
    aws s3 sync dist/ "s3://$FRONTEND_BUCKET/" \
        --delete \
        --no-progress

    # Step B: overwrite hashed JS/CSS bundles with immutable headers
    aws s3 sync dist/assets/ "s3://$FRONTEND_BUCKET/assets/" \
        --cache-control "max-age=31536000, immutable" \
        --no-progress

    # Step C: overwrite fonts with immutable headers
    if [ -d "dist/fonts" ]; then
        aws s3 sync dist/fonts/ "s3://$FRONTEND_BUCKET/fonts/" \
            --cache-control "max-age=31536000, immutable" \
            --no-progress
    fi

    # Step D: overwrite index.html — must never be cached by browsers or CDN
    aws s3 cp dist/index.html "s3://$FRONTEND_BUCKET/index.html" \
        --cache-control "no-cache, no-store, must-revalidate" \
        --content-type "text/html; charset=utf-8" \
        --no-progress

    # ── 5. Invalidate CloudFront ──────────────────────────────────────────
    if [ -n "${CLOUDFRONT_ID:-}" ] && [ "$CLOUDFRONT_ID" != "None" ]; then
        echo ""
        echo "🔄 Invalidating CloudFront cache…"
        INVALIDATION_ID=$(aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_ID" \
            --paths "/*" \
            --query "Invalidation.Id" \
            --output text)
        echo "   Invalidation ID: $INVALIDATION_ID (propagating in ~30 s)"
    fi

    # ── 6. Set CloudWatch log retention on all Lambda functions ───────────
    # Log groups are auto-created by Lambda on first invocation; we set 30-day
    # retention here rather than in CFN (avoids ResourceExistenceCheck errors).
    echo ""
    echo "📋 Setting CloudWatch log retention (30 days)…"
    FUNCTION_NAMES=$(aws cloudformation list-stack-resources \
        --stack-name "$STACK_NAME" \
        --query "StackResourceSummaries[?ResourceType=='AWS::Lambda::Function'].PhysicalResourceId" \
        --output text 2>/dev/null || echo "")

    for FUNC in $FUNCTION_NAMES; do
        LOG_GROUP="/aws/lambda/$FUNC"
        aws logs create-log-group --log-group-name "$LOG_GROUP" 2>/dev/null || true
        aws logs put-retention-policy --log-group-name "$LOG_GROUP" --retention-in-days 30 || true
        echo "   $LOG_GROUP → 30 days"
    done

    # ── 7. Summary ────────────────────────────────────────────────────────
    echo ""
    echo "✅ Production Deployment Complete!"
    echo "==========================================="
    echo "🌐 Live Application : $CLOUDFRONT_URL"
    echo "🔌 API Endpoint     : $API_URL"
    echo "==========================================="
}

# ── Teardown ────────────────────────────────────────────────────────────────

teardown() {
    echo "🗑️  Starting Teardown of Dyslexia App…"

    check_aws_creds

    # ── 1. Disable UserPool DeletionProtection (CloudFormation cannot delete
    #       a UserPool while DeletionProtection is ACTIVE — added in security hardening)
    echo ""
    echo "🔓 Disabling Cognito UserPool deletion protection…"
    USER_POOL_ID=$(aws cloudformation describe-stack-resource \
        --stack-name "$STACK_NAME" \
        --logical-resource-id UserPool \
        --query "StackResourceDetail.PhysicalResourceId" \
        --output text 2>/dev/null || echo "")

    if [ -n "$USER_POOL_ID" ] && [ "$USER_POOL_ID" != "None" ]; then
        aws cognito-idp update-user-pool \
            --user-pool-id "$USER_POOL_ID" \
            --deletion-protection INACTIVE || true
        echo "   UserPool $USER_POOL_ID → INACTIVE"
    else
        echo "   UserPool not found or stack already deleted — skipping."
    fi

    # ── 2. Empty S3 buckets (CloudFormation can't delete non-empty buckets)
    echo ""
    echo "🔍 Finding S3 Buckets…"
    FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
        --output text 2>/dev/null || echo "")
    DOC_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='DocumentBucketName'].OutputValue" \
        --output text 2>/dev/null || echo "")

    if [ -n "$FRONTEND_BUCKET" ] && [ "$FRONTEND_BUCKET" != "None" ]; then
        echo "🧹 Emptying Frontend Bucket ($FRONTEND_BUCKET)…"
        aws s3 rm "s3://$FRONTEND_BUCKET" --recursive || true
    fi

    if [ -n "$DOC_BUCKET" ] && [ "$DOC_BUCKET" != "None" ]; then
        echo "🧹 Emptying Document Bucket ($DOC_BUCKET)…"
        aws s3 rm "s3://$DOC_BUCKET" --recursive || true
    fi

    # ── 3. Delete the stack ───────────────────────────────────────────────
    echo ""
    echo "🔥 Deleting CloudFormation Stack ($STACK_NAME)…"
    cd "$SCRIPT_DIR/backend"
    sam delete --stack-name "$STACK_NAME" --no-prompts

    echo ""
    echo "✅ Teardown Complete!"
}

# ── Entry point ─────────────────────────────────────────────────────────────

case "${1:-}" in
    deploy)   deploy   ;;
    teardown) teardown ;;
    *)
        echo "Usage: ./deploy.sh [deploy|teardown]"
        exit 1
        ;;
esac
