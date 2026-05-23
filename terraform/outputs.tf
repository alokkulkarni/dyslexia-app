# ── Outputs — mirrors the CloudFormation Outputs from the original SAM template
# and the values extracted by deploy.sh

output "api_endpoint" {
  description = "API Gateway endpoint URL (equivalent to ApiEndpoint CFN output)"
  value       = module.api_gateway.api_endpoint
}

output "frontend_bucket_name" {
  description = "S3 bucket name for frontend hosting (equivalent to FrontendBucketName CFN output)"
  value       = module.storage.frontend_bucket_id
}

output "cloudfront_url" {
  description = "CloudFront distribution URL (equivalent to CloudFrontUrl CFN output)"
  value       = "https://${module.cdn.cloudfront_domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (equivalent to CloudFrontDistributionId CFN output)"
  value       = module.cdn.cloudfront_distribution_id
}

output "document_bucket_name" {
  description = "S3 bucket name for document uploads (equivalent to DocumentBucketName CFN output)"
  value       = module.storage.document_bucket_id
}

output "user_pool_id" {
  description = "Cognito UserPool ID"
  value       = module.auth.user_pool_id
}

output "user_pool_client_id" {
  description = "Cognito UserPoolClient ID (used by the frontend)"
  value       = module.auth.user_pool_client_id
}

output "dynamodb_table_name" {
  description = "DynamoDB flashcards table name"
  value       = module.database.table_name
}
