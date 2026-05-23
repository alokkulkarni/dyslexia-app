output "frontend_bucket_id" {
  description = "Frontend S3 bucket name"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  description = "Frontend S3 bucket ARN"
  value       = aws_s3_bucket.frontend.arn
}

output "frontend_bucket_regional_domain_name" {
  description = "Frontend S3 bucket regional domain name (used by CloudFront origin)"
  value       = aws_s3_bucket.frontend.bucket_regional_domain_name
}

output "document_bucket_id" {
  description = "Document upload S3 bucket name"
  value       = aws_s3_bucket.documents.id
}

output "document_bucket_arn" {
  description = "Document upload S3 bucket ARN"
  value       = aws_s3_bucket.documents.arn
}
