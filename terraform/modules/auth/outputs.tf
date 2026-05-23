output "user_pool_id" {
  description = "Cognito UserPool ID"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "Cognito UserPool ARN (used by API Gateway authorizer)"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_client_id" {
  description = "Cognito UserPoolClient ID (injected into Lambda env vars as USER_POOL_CLIENT_ID)"
  value       = aws_cognito_user_pool_client.web.id
}
