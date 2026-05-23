variable "api_execution_arn" {
  description = "API Gateway execution ARN (used to scope the Lambda permission source_arn)"
  type        = string
}

variable "rest_api_id" {
  description = "API Gateway REST API ID"
  type        = string
}

variable "resource_id" {
  description = "API Gateway resource ID for this route"
  type        = string
}

variable "http_method" {
  description = "HTTP method for this route (GET, POST, etc.)"
  type        = string
}

variable "lambda_invoke_arn" {
  description = "Lambda function invoke ARN for the integration"
  type        = string
}

variable "lambda_function_name" {
  description = "Lambda function name (used for the permission resource)"
  type        = string
}

variable "authorizer_id" {
  description = "Cognito authorizer ID — null for public routes"
  type        = string
  default     = null
}

variable "cloudfront_origin" {
  description = "CloudFront origin URL for CORS headers"
  type        = string
}
