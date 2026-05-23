#!/bin/bash
# ── Terraform-based Teardown ─────────────────────────────────────────────────
# Replicates every step of the original teardown() function in deploy.sh.
# Handles all the pre-destroy steps that Terraform cannot do automatically:
#   1. Disable Cognito UserPool deletion protection
#   2. Empty both S3 buckets (Terraform cannot delete non-empty buckets)
#   3. terraform destroy
#
# Usage:
#   ./terraform/scripts/teardown.sh [--auto-approve]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TF_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
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
    log "✅ Credentials OK"
}

# ── Step 1: Disable Cognito deletion protection ───────────────────────────────
# Cognito UserPool has DeletionProtection=ACTIVE — Terraform destroy will fail
# unless we disable it first. Mirrors the original teardown() step exactly.

disable_cognito_deletion_protection() {
    step "Disabling Cognito UserPool deletion protection"
    cd "$TF_DIR"

    # Read the UserPool ID from Terraform state
    USER_POOL_ID=$(terraform output -raw user_pool_id 2>/dev/null || echo "")

    if [ -n "$USER_POOL_ID" ] && [ "$USER_POOL_ID" != "" ]; then
        aws cognito-idp update-user-pool \
            --user-pool-id "$USER_POOL_ID" \
            --deletion-protection INACTIVE \
            --region "$AWS_DEFAULT_REGION" || true
        log "UserPool $USER_POOL_ID → DeletionProtection: INACTIVE"
    else
        log "⚠️  UserPool ID not found in Terraform state — skipping"
    fi
}

# ── Step 2: Empty S3 buckets ──────────────────────────────────────────────────
# Terraform cannot delete non-empty S3 buckets (even with force_destroy=true
# on some provider versions). We empty them explicitly first.

empty_s3_buckets() {
    step "Emptying S3 buckets"
    cd "$TF_DIR"

    FRONTEND_BUCKET=$(terraform output -raw frontend_bucket_name 2>/dev/null || echo "")
    DOC_BUCKET=$(terraform output -raw document_bucket_name 2>/dev/null || echo "")

    if [ -n "$FRONTEND_BUCKET" ] && [ "$FRONTEND_BUCKET" != "" ]; then
        log "Emptying frontend bucket: $FRONTEND_BUCKET"
        aws s3 rm "s3://$FRONTEND_BUCKET" --recursive --no-progress || true
        # Also delete all object versions (versioning is enabled)
        aws s3api list-object-versions \
            --bucket "$FRONTEND_BUCKET" \
            --query 'Versions[].{Key:Key,VersionId:VersionId}' \
            --output text 2>/dev/null | \
        while read -r key version; do
            [ -n "$key" ] && aws s3api delete-object \
                --bucket "$FRONTEND_BUCKET" \
                --key "$key" \
                --version-id "$version" 2>/dev/null || true
        done
        log "✅ Frontend bucket emptied"
    else
        log "⚠️  Frontend bucket not found — skipping"
    fi

    if [ -n "$DOC_BUCKET" ] && [ "$DOC_BUCKET" != "" ]; then
        log "Emptying document bucket: $DOC_BUCKET"
        aws s3 rm "s3://$DOC_BUCKET" --recursive --no-progress || true
        # Also delete all object versions
        aws s3api list-object-versions \
            --bucket "$DOC_BUCKET" \
            --query 'Versions[].{Key:Key,VersionId:VersionId}' \
            --output text 2>/dev/null | \
        while read -r key version; do
            [ -n "$key" ] && aws s3api delete-object \
                --bucket "$DOC_BUCKET" \
                --key "$key" \
                --version-id "$version" 2>/dev/null || true
        done
        log "✅ Document bucket emptied"
    else
        log "⚠️  Document bucket not found — skipping"
    fi
}

# ── Step 3: Terraform destroy ─────────────────────────────────────────────────

terraform_destroy() {
    step "Running terraform destroy"
    cd "$TF_DIR"

    if [ "$AUTO_APPROVE" = "--auto-approve" ]; then
        terraform destroy -auto-approve
    else
        echo ""
        echo "⚠️  This will PERMANENTLY destroy all infrastructure."
        echo "   Type 'yes' at the prompt to confirm."
        terraform destroy
    fi
}

# ── Main ──────────────────────────────────────────────────────────────────────

echo ""
echo "🗑️  Dyslexia App — Terraform Teardown"
echo "======================================="

check_aws_creds
disable_cognito_deletion_protection
empty_s3_buckets
terraform_destroy

echo ""
echo "✅ Teardown Complete — all infrastructure destroyed."
