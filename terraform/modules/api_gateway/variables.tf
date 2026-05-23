variable "stack_name" {
  description = "Logical stack name used as a resource name prefix"
  type        = string
}

variable "cloudfront_origin" {
  description = "CloudFront distribution URL for CORS and authorizer"
  type        = string
}

variable "user_pool_arn" {
  description = "Cognito UserPool ARN for the API Gateway authorizer"
  type        = string
}

variable "throttle_burst_limit" {
  description = "API Gateway burst throttle limit"
  type        = number
  default     = 100
}

variable "throttle_rate_limit" {
  description = "API Gateway steady-state rate limit (req/s)"
  type        = number
  default     = 50
}

variable "auth_function_invoke_arn" {
  description = "Auth Lambda invoke ARN"
  type        = string
}

variable "auth_function_name" {
  description = "Auth Lambda function name"
  type        = string
}

variable "upload_function_invoke_arn" {
  description = "Upload Lambda invoke ARN"
  type        = string
}

variable "upload_function_name" {
  description = "Upload Lambda function name"
  type        = string
}

variable "generate_function_invoke_arn" {
  description = "Generate Lambda invoke ARN"
  type        = string
}

variable "generate_function_name" {
  description = "Generate Lambda function name"
  type        = string
}

variable "get_flashcards_function_invoke_arn" {
  description = "GetFlashcards Lambda invoke ARN"
  type        = string
}

variable "get_flashcards_function_name" {
  description = "GetFlashcards Lambda function name"
  type        = string
}
