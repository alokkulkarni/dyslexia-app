variable "stack_name" {
  description = "Logical stack name used as a resource name prefix"
  type        = string
}

variable "access_token_validity_minutes" {
  description = "Cognito access token validity in minutes"
  type        = number
  default     = 60
}

variable "id_token_validity_minutes" {
  description = "Cognito ID token validity in minutes"
  type        = number
  default     = 60
}

variable "refresh_token_validity_days" {
  description = "Cognito refresh token validity in days"
  type        = number
  default     = 30
}
