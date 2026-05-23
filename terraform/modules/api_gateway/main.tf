# ── REST API ────────────────────────────────────────────────────────────────

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.stack_name}-api"
  description = "Dyslexia App API — ${var.stack_name}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# ── Cognito Authorizer ───────────────────────────────────────────────────────
# Validates the Cognito JWT on every protected route.

resource "aws_api_gateway_authorizer" "cognito" {
  name            = "CognitoAuthorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [var.user_pool_arn]
  identity_source = "method.request.header.Authorization"
}

# ═══════════════════════════════════════════════════════════════════════════
# /auth resource
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "auth"
}

# /auth/signup
resource "aws_api_gateway_resource" "auth_signup" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "signup"
}

module "auth_signup" {
  source = "./route"

  rest_api_id          = aws_api_gateway_rest_api.main.id
  api_execution_arn    = aws_api_gateway_rest_api.main.execution_arn
  resource_id          = aws_api_gateway_resource.auth_signup.id
  http_method          = "POST"
  lambda_invoke_arn    = var.auth_function_invoke_arn
  lambda_function_name = var.auth_function_name
  authorizer_id        = null # public — no auth required
  cloudfront_origin    = var.cloudfront_origin
}

# /auth/confirm
resource "aws_api_gateway_resource" "auth_confirm" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "confirm"
}

module "auth_confirm" {
  source = "./route"

  rest_api_id          = aws_api_gateway_rest_api.main.id
  api_execution_arn    = aws_api_gateway_rest_api.main.execution_arn
  resource_id          = aws_api_gateway_resource.auth_confirm.id
  http_method          = "POST"
  lambda_invoke_arn    = var.auth_function_invoke_arn
  lambda_function_name = var.auth_function_name
  authorizer_id        = null # public
  cloudfront_origin    = var.cloudfront_origin
}

# /auth/login
resource "aws_api_gateway_resource" "auth_login" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "login"
}

module "auth_login" {
  source = "./route"

  rest_api_id          = aws_api_gateway_rest_api.main.id
  api_execution_arn    = aws_api_gateway_rest_api.main.execution_arn
  resource_id          = aws_api_gateway_resource.auth_login.id
  http_method          = "POST"
  lambda_invoke_arn    = var.auth_function_invoke_arn
  lambda_function_name = var.auth_function_name
  authorizer_id        = null # public
  cloudfront_origin    = var.cloudfront_origin
}

# ═══════════════════════════════════════════════════════════════════════════
# /document resource
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_api_gateway_resource" "document" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "document"
}

# /document/upload
resource "aws_api_gateway_resource" "document_upload" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.document.id
  path_part   = "upload"
}

module "document_upload" {
  source = "./route"

  rest_api_id          = aws_api_gateway_rest_api.main.id
  api_execution_arn    = aws_api_gateway_rest_api.main.execution_arn
  resource_id          = aws_api_gateway_resource.document_upload.id
  http_method          = "POST"
  lambda_invoke_arn    = var.upload_function_invoke_arn
  lambda_function_name = var.upload_function_name
  authorizer_id        = aws_api_gateway_authorizer.cognito.id # protected
  cloudfront_origin    = var.cloudfront_origin
}

# ═══════════════════════════════════════════════════════════════════════════
# /flashcards resource
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_api_gateway_resource" "flashcards" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "flashcards"
}

# GET /flashcards
module "get_flashcards" {
  source = "./route"

  rest_api_id          = aws_api_gateway_rest_api.main.id
  api_execution_arn    = aws_api_gateway_rest_api.main.execution_arn
  resource_id          = aws_api_gateway_resource.flashcards.id
  http_method          = "GET"
  lambda_invoke_arn    = var.get_flashcards_function_invoke_arn
  lambda_function_name = var.get_flashcards_function_name
  authorizer_id        = aws_api_gateway_authorizer.cognito.id # protected
  cloudfront_origin    = var.cloudfront_origin
}

# /flashcards/generate
resource "aws_api_gateway_resource" "flashcards_generate" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.flashcards.id
  path_part   = "generate"
}

module "flashcards_generate" {
  source = "./route"

  rest_api_id          = aws_api_gateway_rest_api.main.id
  api_execution_arn    = aws_api_gateway_rest_api.main.execution_arn
  resource_id          = aws_api_gateway_resource.flashcards_generate.id
  http_method          = "POST"
  lambda_invoke_arn    = var.generate_function_invoke_arn
  lambda_function_name = var.generate_function_name
  authorizer_id        = aws_api_gateway_authorizer.cognito.id # protected
  cloudfront_origin    = var.cloudfront_origin
}

# ═══════════════════════════════════════════════════════════════════════════
# Deployment & Stage
# ═══════════════════════════════════════════════════════════════════════════

# Trigger a new deployment whenever any method or integration changes.
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  # Force a new deployment when any route changes
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.auth.id,
      aws_api_gateway_resource.auth_signup.id,
      aws_api_gateway_resource.auth_confirm.id,
      aws_api_gateway_resource.auth_login.id,
      aws_api_gateway_resource.document.id,
      aws_api_gateway_resource.document_upload.id,
      aws_api_gateway_resource.flashcards.id,
      aws_api_gateway_resource.flashcards_generate.id,
      module.auth_signup.method_id,
      module.auth_confirm.method_id,
      module.auth_login.method_id,
      module.document_upload.method_id,
      module.get_flashcards.method_id,
      module.flashcards_generate.method_id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    module.auth_signup,
    module.auth_confirm,
    module.auth_login,
    module.document_upload,
    module.get_flashcards,
    module.flashcards_generate,
  ]
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "Prod"

  # X-Ray tracing on the stage
  xray_tracing_enabled = true

  # Access logging — CLF format matches what API Gateway emits by default
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_access.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
}

resource "aws_cloudwatch_log_group" "api_access" {
  name              = "/aws/apigateway/${var.stack_name}-access"
  retention_in_days = 30
}

# ── Stage-level throttling ───────────────────────────────────────────────────
# Mirrors the MethodSettings in the SAM template (burst=100, rate=50).

resource "aws_api_gateway_method_settings" "throttling" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "*/*"

  settings {
    throttling_burst_limit = var.throttle_burst_limit
    throttling_rate_limit  = var.throttle_rate_limit
    metrics_enabled        = true
    logging_level          = "INFO"
    data_trace_enabled     = false # do not log full request/response bodies in prod
  }
}

# ── API Gateway CloudWatch role ──────────────────────────────────────────────
# Required for API Gateway to write access logs and metrics to CloudWatch.

resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${var.stack_name}-apigw-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}
