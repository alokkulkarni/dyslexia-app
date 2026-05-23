# ── Frontend Bucket ─────────────────────────────────────────────────────────
# Private S3 bucket — served exclusively through CloudFront via OAC.
# No public access, no website hosting endpoint.

resource "aws_s3_bucket" "frontend" {
  bucket_prefix = "${var.stack_name}-frontend-"

  # Allow Terraform destroy to delete the bucket even if it has objects.
  # The deploy script empties the bucket before destroy; this is a safety net.
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

# ── Document Upload Bucket ──────────────────────────────────────────────────
# Stores user-uploaded PDFs and TXT files under uploads/{userId}/{uuid}.{ext}.
# Encrypted at rest, all public access blocked.

resource "aws_s3_bucket" "documents" {
  bucket_prefix = "${var.stack_name}-documents-"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rule: expire uploaded documents after 90 days to control storage costs.
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "expire-uploads"
    status = "Enabled"

    filter {
      prefix = "uploads/"
    }

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}
