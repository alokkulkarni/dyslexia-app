# ── Origin Access Control ───────────────────────────────────────────────────
# Replaces the legacy OAI. CloudFront signs requests to S3 with SigV4.

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.stack_name}-oac"
  description                       = "OAC for ${var.stack_name} frontend bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── Security Headers Policy ─────────────────────────────────────────────────
# Mirrors the SecurityHeadersPolicy in the SAM template exactly.

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.stack_name}-security-headers"
  comment = "Security response headers for ${var.stack_name}"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' https://*.execute-api.eu-west-2.amazonaws.com https://api.elevenlabs.io https://api.openai.com;"
      override                = true
    }
  }
}

# ── CloudFront Distribution ─────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "${var.stack_name} frontend distribution"
  price_class         = "PriceClass_100" # US, Canada, Europe — cheapest tier

  origin {
    domain_name              = var.frontend_bucket_regional_domain_name
    origin_id                = "FrontendBucketOrigin"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    target_origin_id       = "FrontendBucketOrigin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400   # 1 day default
    max_ttl     = 31536000 # 1 year max
    compress    = true
  }

  # SPA routing: return index.html for 403/404 so React Router handles the path
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }
}

# ── S3 Bucket Policy ────────────────────────────────────────────────────────
# Grants CloudFront (via OAC) read access to the frontend bucket.
# Scoped to the specific distribution ARN — no other CloudFront distribution
# can access this bucket.

resource "aws_s3_bucket_policy" "frontend" {
  bucket = var.frontend_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${var.frontend_bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}
