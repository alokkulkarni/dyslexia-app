provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.stack_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ── Storage module ──────────────────────────────────────────────────────────
# Creates the private frontend S3 bucket and the document upload S3 bucket.

module "storage" {
  source     = "./modules/storage"
  stack_name = var.stack_name
}

# ── CDN module ──────────────────────────────────────────────────────────────
# CloudFront distribution with OAC, security headers policy, and SPA routing.

module "cdn" {
  source             = "./modules/cdn"
  stack_name         = var.stack_name
  frontend_bucket_id = module.storage.frontend_bucket_id
  frontend_bucket_regional_domain_name = module.storage.frontend_bucket_regional_domain_name
  frontend_bucket_arn = module.storage.frontend_bucket_arn
}

# ── Auth module ─────────────────────────────────────────────────────────────
# Cognito UserPool + UserPoolClient with hardened password policy.

module "auth" {
  source                              = "./modules/auth"
  stack_name                          = var.stack_name
  access_token_validity_minutes       = var.cognito_access_token_validity_minutes
  id_token_validity_minutes           = var.cognito_id_token_validity_minutes
  refresh_token_validity_days         = var.cognito_refresh_token_validity_days
}

# ── Database module ─────────────────────────────────────────────────────────
# DynamoDB table with on-demand billing, SSE, and PITR.

module "database" {
  source     = "./modules/database"
  stack_name = var.stack_name
}

# ── Lambda module ───────────────────────────────────────────────────────────
# All four Lambda functions with IAM roles, env vars, X-Ray tracing,
# CloudWatch log groups, and log retention.

module "lambda" {
  source     = "./modules/lambda"
  stack_name = var.stack_name

  runtime             = var.lambda_runtime
  architecture        = var.lambda_architecture
  default_timeout     = var.lambda_default_timeout
  generate_timeout    = var.lambda_generate_timeout
  generate_reserved_concurrency = var.lambda_generate_reserved_concurrency
  source_dir          = var.lambda_source_dir
  log_retention_days  = var.log_retention_days

  # Runtime environment variables injected into every function
  table_name            = module.database.table_name
  document_bucket_name  = module.storage.document_bucket_id
  user_pool_client_id   = module.auth.user_pool_client_id
  allowed_origin        = "https://${module.cdn.cloudfront_domain_name}"
  aws_region            = var.aws_region
  bedrock_model_arn     = "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
  document_bucket_arn   = module.storage.document_bucket_arn
  table_arn             = module.database.table_arn
}

# ── API Gateway module ──────────────────────────────────────────────────────
# REST API with Cognito authorizer, CORS, throttling, and all four routes.

module "api_gateway" {
  source     = "./modules/api_gateway"
  stack_name = var.stack_name

  cloudfront_origin     = "https://${module.cdn.cloudfront_domain_name}"
  user_pool_arn         = module.auth.user_pool_arn
  throttle_burst_limit  = var.api_throttle_burst_limit
  throttle_rate_limit   = var.api_throttle_rate_limit

  auth_function_invoke_arn          = module.lambda.auth_function_invoke_arn
  upload_function_invoke_arn        = module.lambda.upload_function_invoke_arn
  generate_function_invoke_arn      = module.lambda.generate_function_invoke_arn
  get_flashcards_function_invoke_arn = module.lambda.get_flashcards_function_invoke_arn

  auth_function_name          = module.lambda.auth_function_name
  upload_function_name        = module.lambda.upload_function_name
  generate_function_name      = module.lambda.generate_function_name
  get_flashcards_function_name = module.lambda.get_flashcards_function_name
}
