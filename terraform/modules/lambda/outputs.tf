output "auth_function_invoke_arn" {
  description = "Auth Lambda function invoke ARN (used by API Gateway integration)"
  value       = aws_lambda_function.auth.invoke_arn
}

output "auth_function_name" {
  description = "Auth Lambda function name (used for API Gateway permission)"
  value       = aws_lambda_function.auth.function_name
}

output "upload_function_invoke_arn" {
  description = "Upload Lambda function invoke ARN"
  value       = aws_lambda_function.upload.invoke_arn
}

output "upload_function_name" {
  description = "Upload Lambda function name"
  value       = aws_lambda_function.upload.function_name
}

output "generate_function_invoke_arn" {
  description = "Generate Lambda function invoke ARN"
  value       = aws_lambda_function.generate.invoke_arn
}

output "generate_function_name" {
  description = "Generate Lambda function name"
  value       = aws_lambda_function.generate.function_name
}

output "get_flashcards_function_invoke_arn" {
  description = "GetFlashcards Lambda function invoke ARN"
  value       = aws_lambda_function.get_flashcards.invoke_arn
}

output "get_flashcards_function_name" {
  description = "GetFlashcards Lambda function name"
  value       = aws_lambda_function.get_flashcards.function_name
}
