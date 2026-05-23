# ── DynamoDB Flashcards Table ───────────────────────────────────────────────
# Mirrors the FlashcardsTable resource in the SAM template exactly.
# Schema: userId (PK, String) + deckId (SK, String)
# Item structure: { userId, deckId, fileName, createdAt, flashcards[] }

resource "aws_dynamodb_table" "flashcards" {
  name         = "DyslexiaFlashcards"
  billing_mode = "PAY_PER_REQUEST" # on-demand — no capacity planning needed

  hash_key  = "userId"
  range_key = "deckId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "deckId"
    type = "S"
  }

  # CVE-14: encryption at rest with AWS-managed keys
  server_side_encryption {
    enabled = true
  }

  # PROD: point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = true
  }

  # Prevent accidental deletion in production
  lifecycle {
    prevent_destroy = false # set to true in production if you want extra safety
  }
}
