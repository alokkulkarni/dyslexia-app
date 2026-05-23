#!/usr/bin/env zsh
# =============================================================================
# Nova Act — CLI Example (Headed / Visible Browser)
# =============================================================================
# Prerequisites:
#   1. Set your API key:  export NOVA_ACT_API_KEY="your_key_here"
#      Get one at: https://nova.amazon.com/act?tab=dev_tools
#   2. Activate the venv before running:
#      source /Users/alokkulkarni/Documents/Development/dyslexia-app/nova-act-env/bin/activate
#
# Run this script:
#   chmod +x 01_cli_example.sh
#   ./01_cli_example.sh
# =============================================================================

# Path to the act CLI inside the venv
ACT="/Users/alokkulkarni/Documents/Development/dyslexia-app/nova-act-env/bin/act"
SESSION="demo"

echo "============================================"
echo " Nova Act CLI Demo — Headed (Visible) Mode"
echo "============================================"
echo ""

# ── Step 1: Navigate to example.com ──────────────────────────────────────────
echo "▶ Step 1: Navigate to example.com"
$ACT browser goto https://example.com \
  --session-id "$SESSION" \
  --headed

echo ""

# ── Step 2: Ask a read-only question about the current page ──────────────────
echo "▶ Step 2: Ask what's on the page"
$ACT browser ask "What is the main heading and purpose of this page?" \
  --session-id "$SESSION"

echo ""

# ── Step 3: Extract structured data ──────────────────────────────────────────
echo "▶ Step 3: Extract the page title and any links"
$ACT browser extract \
  "Extract the page title and all hyperlink texts visible on the page" \
  --schema string \
  --session-id "$SESSION" \
  --nova-arg max_steps=10

echo ""

# ── Step 4: Multi-step execute — navigate to IANA and find info ──────────────
echo "▶ Step 4: Multi-step execute — go to IANA and find domain info"
$ACT browser execute \
  "1. Click the 'More information...' link on the page
   2. Wait for the new page to load
   3. Find the section about the IANA organisation" \
  --session-id "$SESSION" \
  --nova-arg max_steps=15

echo ""

# ── Step 5: Verify a condition ────────────────────────────────────────────────
echo "▶ Step 5: Verify we are on the IANA website"
$ACT browser verify "The page is about IANA or domain name administration" \
  --session-id "$SESSION"

echo ""

# ── Step 6: Take a screenshot ────────────────────────────────────────────────
echo "▶ Step 6: Capture a screenshot"
SCREENSHOT_PATH="./nova-act-examples/screenshots/iana_page.png"
mkdir -p ./nova-act-examples/screenshots
$ACT browser screenshot \
  --output "$SCREENSHOT_PATH" \
  --session-id "$SESSION"
echo "   Screenshot saved to: $SCREENSHOT_PATH"

echo ""
echo "============================================"
echo " Demo complete! Session '$SESSION' is still"
echo " open — you can keep using it."
echo " To list sessions: act browser session list"
echo "============================================"
