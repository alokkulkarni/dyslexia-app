output "api_endpoint" {
  description = "API Gateway invoke URL (equivalent to ApiEndpoint CFN output)"
  value       = "${aws_api_gateway_stage.prod.invoke_url}/"
}

output "rest_api_id" {
  description = "API Gateway REST API ID"
  value       = aws_api_gateway_rest_api.main.id
}

output "stage_name" {
  description = "API Gateway stage name"
  value       = aws_api_gateway_stage.prod.stage_name
}
