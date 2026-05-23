output "method_id" {
  description = "API Gateway method ID (used to trigger redeployment on changes)"
  value       = aws_api_gateway_method.main.id
}
