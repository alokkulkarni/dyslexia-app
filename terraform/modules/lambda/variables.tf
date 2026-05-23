variable "stack_name" {
  description = "Logical stack name used as a resource name prefix"
  type        = string
}

variable "runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs20.x"
}

variable "architecture" {
  description = "Lambda CPU architecture (arm64 or x86_64)"
  type        = string
  default     = "arm64"
}

variable "default_timeout" {
  description = "Default Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "generate_timeout" {
  description = "Timeout for the generate function in seconds"
  type        = number
  default     = 60
}

variable "generate_reserved_concurrency" {
  description = "Reserved concurrency cap for the generate function"
  type        = number
  default     = 20
}

variable "source_dir" {
  description = "Path to the Lambda source directory"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# ── Runtime environment variables ────────────────────────────────────────────

variable "table_name" {
  description = "DynamoDB table name"
  type        = string
}

variable "document_bucket_name" {
  description = "Document upload S3 bucket name"
  type        = string
}

variable "user_pool_client_id" {
  description = "Cognito UserPoolClient ID"
  type        = string
}

variable "allowed_origin" {
  description = "CORS allowed origin (CloudFront URL)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "bedrock_model_arn" {
  description = "Bedrock foundation model ARN for GenerateFunction IAM policy"
  type        = string
}

variable "document_bucket_arn" {
  description = "Document upload S3 bucket ARN for IAM policies"
  type        = string
}

variable "table_arn" {
  description = "DynamoDB table ARN for IAM policies"
  type        = string
}
