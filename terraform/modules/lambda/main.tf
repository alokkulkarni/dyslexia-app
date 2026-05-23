# ── Lambda source archive ───────────────────────────────────────────────────
# All four functions share the same source directory (backend/src/).
# The archive is created at plan time from the local source files.

data "archive_file" "lambda_source" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/lambda_source.zip"

  # Exclude dev artifacts that should not be in the deployment package
  excludes = [
    "node_modules/.cache",
    ".DS_Store",
    "*.test.js",
    "*.spec.js",
  ]
}

# ── Shared IAM assume-role policy ───────────────────────────────────────────

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# ── Common environment variables ─────────────────────────────────────────────
# Defined once, referenced by all four functions.

locals {
  common_env_vars = {
    TABLE_NAME                          = var.table_name
    DOCUMENT_BUCKET                     = var.document_bucket_name
    USER_POOL_CLIENT_ID                 = var.user_pool_client_id
    ALLOWED_ORIGIN                      = var.allowed_origin
    AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    AWS_REGION                          = var.aws_region
  }
}

# ═══════════════════════════════════════════════════════════════════════════
# AuthFunction
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_iam_role" "auth" {
  name               = "${var.stack_name}-auth-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "auth_basic_execution" {
  role       = aws_iam_role.auth.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "auth_xray" {
  role       = aws_iam_role.auth.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_lambda_function" "auth" {
  function_name = "${var.stack_name}-auth"
  role          = aws_iam_role.auth.arn
  handler       = "auth.handler"
  runtime       = var.runtime
  architectures = [var.architecture]
  timeout       = var.default_timeout
  memory_size   = 256 # auth is lightweight — no heavy processing

  filename         = data.archive_file.lambda_source.output_path
  source_code_hash = data.archive_file.lambda_source.output_base64sha256

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = local.common_env_vars
  }

  depends_on = [aws_iam_role_policy_attachment.auth_basic_execution]
}

resource "aws_cloudwatch_log_group" "auth" {
  name              = "/aws/lambda/${aws_lambda_function.auth.function_name}"
  retention_in_days = var.log_retention_days
}

# ═══════════════════════════════════════════════════════════════════════════
# UploadFunction
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_iam_role" "upload" {
  name               = "${var.stack_name}-upload-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "upload_basic_execution" {
  role       = aws_iam_role.upload.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "upload_xray" {
  role       = aws_iam_role.upload.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# S3 CRUD on the document bucket (mirrors SAM S3CrudPolicy)
data "aws_iam_policy_document" "upload_s3" {
  statement {
    sid    = "S3CrudDocumentBucket"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      var.document_bucket_arn,
      "${var.document_bucket_arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "upload_s3" {
  name   = "s3-crud-document-bucket"
  role   = aws_iam_role.upload.id
  policy = data.aws_iam_policy_document.upload_s3.json
}

resource "aws_lambda_function" "upload" {
  function_name = "${var.stack_name}-upload"
  role          = aws_iam_role.upload.arn
  handler       = "upload.handler"
  runtime       = var.runtime
  architectures = [var.architecture]
  timeout       = var.default_timeout
  memory_size   = 512

  filename         = data.archive_file.lambda_source.output_path
  source_code_hash = data.archive_file.lambda_source.output_base64sha256

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = local.common_env_vars
  }

  depends_on = [aws_iam_role_policy_attachment.upload_basic_execution]
}

resource "aws_cloudwatch_log_group" "upload" {
  name              = "/aws/lambda/${aws_lambda_function.upload.function_name}"
  retention_in_days = var.log_retention_days
}

# ═══════════════════════════════════════════════════════════════════════════
# GenerateFunction
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_iam_role" "generate" {
  name               = "${var.stack_name}-generate-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "generate_basic_execution" {
  role       = aws_iam_role.generate.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "generate_xray" {
  role       = aws_iam_role.generate.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# DynamoDB CRUD + S3 Read + Bedrock InvokeModel (mirrors SAM policies)
data "aws_iam_policy_document" "generate_permissions" {
  statement {
    sid    = "DynamoDBCrud"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
    ]
    resources = [
      var.table_arn,
      "${var.table_arn}/index/*",
    ]
  }

  statement {
    sid    = "S3ReadDocumentBucket"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]
    resources = [
      var.document_bucket_arn,
      "${var.document_bucket_arn}/*",
    ]
  }

  statement {
    sid    = "BedrockInvokeModel"
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
    ]
    resources = [
      var.bedrock_model_arn,
    ]
  }
}

resource "aws_iam_role_policy" "generate_permissions" {
  name   = "generate-permissions"
  role   = aws_iam_role.generate.id
  policy = data.aws_iam_policy_document.generate_permissions.json
}

resource "aws_lambda_function" "generate" {
  function_name = "${var.stack_name}-generate"
  role          = aws_iam_role.generate.arn
  handler       = "generate.handler"
  runtime       = var.runtime
  architectures = [var.architecture]
  timeout       = var.generate_timeout
  memory_size   = 1024 # Bedrock + PDF parsing benefits from more memory

  # CVE-12: cap concurrency to prevent Bedrock cost exhaustion / DoS
  reserved_concurrent_executions = var.generate_reserved_concurrency

  filename         = data.archive_file.lambda_source.output_path
  source_code_hash = data.archive_file.lambda_source.output_base64sha256

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = local.common_env_vars
  }

  depends_on = [aws_iam_role_policy_attachment.generate_basic_execution]
}

resource "aws_cloudwatch_log_group" "generate" {
  name              = "/aws/lambda/${aws_lambda_function.generate.function_name}"
  retention_in_days = var.log_retention_days
}

# ═══════════════════════════════════════════════════════════════════════════
# GetFlashcardsFunction
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_iam_role" "get_flashcards" {
  name               = "${var.stack_name}-get-flashcards-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "get_flashcards_basic_execution" {
  role       = aws_iam_role.get_flashcards.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "get_flashcards_xray" {
  role       = aws_iam_role.get_flashcards.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# DynamoDB read-only (mirrors SAM DynamoDBReadPolicy)
data "aws_iam_policy_document" "get_flashcards_dynamodb" {
  statement {
    sid    = "DynamoDBRead"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchGetItem",
    ]
    resources = [
      var.table_arn,
      "${var.table_arn}/index/*",
    ]
  }
}

resource "aws_iam_role_policy" "get_flashcards_dynamodb" {
  name   = "dynamodb-read"
  role   = aws_iam_role.get_flashcards.id
  policy = data.aws_iam_policy_document.get_flashcards_dynamodb.json
}

resource "aws_lambda_function" "get_flashcards" {
  function_name = "${var.stack_name}-get-flashcards"
  role          = aws_iam_role.get_flashcards.arn
  handler       = "flashcards.handler"
  runtime       = var.runtime
  architectures = [var.architecture]
  timeout       = var.default_timeout
  memory_size   = 256 # read-only DynamoDB query — minimal memory needed

  filename         = data.archive_file.lambda_source.output_path
  source_code_hash = data.archive_file.lambda_source.output_base64sha256

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = local.common_env_vars
  }

  depends_on = [aws_iam_role_policy_attachment.get_flashcards_basic_execution]
}

resource "aws_cloudwatch_log_group" "get_flashcards" {
  name              = "/aws/lambda/${aws_lambda_function.get_flashcards.function_name}"
  retention_in_days = var.log_retention_days
}
