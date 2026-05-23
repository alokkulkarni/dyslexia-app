# ── Global ─────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-west-2"
}

variable "stack_name" {
  description = "Logical name for this deployment — used as a prefix/tag on all resources"
  type        = string
  default     = "dyslexia-app"
}

variable "environment" {
  description = "Deployment environment (production, staging, dev)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "staging", "dev"], var.environment)
    error_message = "environment must be one of: production, staging, dev"
  }
}

# ── Lambda ──────────────────────────────────────────────────────────────────

variable "lambda_runtime" {
  description = "Node.js runtime for all Lambda functions"
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_architecture" {
  description = "CPU architecture for Lambda (arm64 = Graviton2, ~20% cheaper)"
  type        = string
  default     = "arm64"
}

variable "lambda_default_timeout" {
  description = "Default Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_generate_timeout" {
  description = "Timeout for the GenerateFunction (Bedrock + PDF parsing needs more time)"
  type        = number
  default     = 60
}

variable "lambda_generate_reserved_concurrency" {
  description = "Reserved concurrency cap for GenerateFunction — prevents Bedrock cost exhaustion"
  type        = number
  default     = 20
}

variable "lambda_source_dir" {
  description = "Path to the backend Lambda source directory (relative to the terraform/ folder)"
  type        = string
  default     = "../backend/src"
}

# ── API Gateway ─────────────────────────────────────────────────────────────

variable "api_throttle_burst_limit" {
  description = "API Gateway burst limit (requests)"
  type        = number
  default     = 100
}

variable "api_throttle_rate_limit" {
  description = "API Gateway steady-state rate limit (requests/second)"
  type        = number
  default     = 50
}

# ── Cognito ─────────────────────────────────────────────────────────────────

variable "cognito_access_token_validity_minutes" {
  description = "Cognito access token validity in minutes"
  type        = number
  default     = 60
}

variable "cognito_id_token_validity_minutes" {
  description = "Cognito ID token validity in minutes"
  type        = number
  default     = 60
}

variable "cognito_refresh_token_validity_days" {
  description = "Cognito refresh token validity in days"
  type        = number
  default     = 30
}

# ── CloudWatch ──────────────────────────────────────────────────────────────

variable "log_retention_days" {
  description = "CloudWatch log retention period in days for all Lambda log groups"
  type        = number
  default     = 30
}

# ── Frontend ────────────────────────────────────────────────────────────────

variable "frontend_dist_dir" {
  description = "Path to the built frontend dist directory (relative to the terraform/ folder)"
  type        = string
  default     = "../frontend/dist"
}
