# ── Reusable route sub-module ────────────────────────────────────────────────
# Creates a single API Gateway method + Lambda integration + OPTIONS preflight.
# Used by the api_gateway module for every route to avoid repetition.

# ── Main method (GET or POST) ────────────────────────────────────────────────

resource "aws_api_gateway_method" "main" {
  rest_api_id   = var.rest_api_id
  resource_id   = var.resource_id
  http_method   = var.http_method
  authorization = var.authorizer_id != null ? "COGNITO_USER_POOLS" : "NONE"
  authorizer_id = var.authorizer_id
}

resource "aws_api_gateway_integration" "main" {
  rest_api_id             = var.rest_api_id
  resource_id             = var.resource_id
  http_method             = aws_api_gateway_method.main.http_method
  integration_http_method = "POST" # Lambda proxy always uses POST
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
}

# ── OPTIONS preflight (CORS) ─────────────────────────────────────────────────

resource "aws_api_gateway_method" "options" {
  rest_api_id   = var.rest_api_id
  resource_id   = var.resource_id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options" {
  rest_api_id = var.rest_api_id
  resource_id = var.resource_id
  http_method = aws_api_gateway_method.options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_200" {
  rest_api_id = var.rest_api_id
  resource_id = var.resource_id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "options_200" {
  rest_api_id = var.rest_api_id
  resource_id = var.resource_id
  http_method = aws_api_gateway_method.options.http_method
  status_code = aws_api_gateway_method_response.options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.cloudfront_origin}'"
  }

  depends_on = [aws_api_gateway_integration.options]
}

# ── Lambda permission ────────────────────────────────────────────────────────
# Grants API Gateway permission to invoke the Lambda function for this route.
# source_arn is scoped to this specific API to prevent confused-deputy attacks.

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke-${var.http_method}"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_execution_arn}/*/*"
}
