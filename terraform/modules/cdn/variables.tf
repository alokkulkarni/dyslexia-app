variable "stack_name" {
  description = "Logical stack name used as a resource name prefix"
  type        = string
}

variable "frontend_bucket_id" {
  description = "Frontend S3 bucket name (ID)"
  type        = string
}

variable "frontend_bucket_arn" {
  description = "Frontend S3 bucket ARN"
  type        = string
}

variable "frontend_bucket_regional_domain_name" {
  description = "Frontend S3 bucket regional domain name for CloudFront origin"
  type        = string
}
