# ── Cognito User Pool ───────────────────────────────────────────────────────
# Mirrors the UserPool resource in the SAM template exactly.

resource "aws_cognito_user_pool" "main" {
  name = "${var.stack_name}-users"

  # Auto-verify email addresses
  auto_verified_attributes = ["email"]

  # CVE-4: strong password policy
  password_policy {
    minimum_length                   = 10
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  # Deletion protection — must be disabled before destroy (handled in teardown.sh)
  deletion_protection = "ACTIVE"

  # Account recovery via verified email only
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Use email as the username alias
  username_attributes      = ["email"]
  username_configuration {
    case_sensitive = false
  }

  # Email verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = true

    string_attribute_constraints {
      min_length = 5
      max_length = 254
    }
  }
}

# ── Cognito User Pool Client ─────────────────────────────────────────────────
# Public browser client — no secret, short-lived tokens.

resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.stack_name}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # Short-lived tokens to limit blast radius of token theft
  access_token_validity  = var.access_token_validity_minutes
  id_token_validity      = var.id_token_validity_minutes
  refresh_token_validity = var.refresh_token_validity_days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Prevent token reuse
  enable_token_revocation = true

  # Do not allow unauthenticated identities
  prevent_user_existence_errors = "ENABLED"
}
