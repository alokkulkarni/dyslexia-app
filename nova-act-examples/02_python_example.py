"""
Nova Act — Python Script Example (Headed / Visible Browser)
============================================================
Prerequisites:
    1. Set your API key:
         export NOVA_ACT_API_KEY="your_key_here"
       Get one at: https://nova.amazon.com/act?tab=dev_tools

    2. Activate the venv and run:
         source /Users/alokkulkarni/Documents/Development/dyslexia-app/nova-act-env/bin/activate
         python nova-act-examples/02_python_example.py

What this script does:
    - Opens example.com in a VISIBLE (headed) browser
    - Extracts the page title and heading
    - Clicks the "More information..." link
    - Extracts structured data from the IANA page using a Pydantic schema
    - Verifies the navigation succeeded
    - Prints a summary of everything found
"""

import os
from pydantic import BaseModel
from nova_act import NovaAct, BOOL_SCHEMA, STRING_SCHEMA


# ── Pydantic schema for structured extraction ─────────────────────────────────
class PageSummary(BaseModel):
    """Structured data we want to extract from the IANA page."""
    page_title: str
    organisation_name: str
    main_purpose: str
    has_contact_info: bool


def main() -> None:
    # Check API key is set
    if not os.environ.get("NOVA_ACT_API_KEY"):
        raise EnvironmentError(
            "NOVA_ACT_API_KEY is not set.\n"
            "Get your key at: https://nova.amazon.com/act?tab=dev_tools\n"
            "Then run: export NOVA_ACT_API_KEY='your_key_here'"
        )

    print("=" * 55)
    print(" Nova Act Python Demo — Headed (Visible) Mode")
    print("=" * 55)

    # ── Open browser — headless=False makes it visible ────────────────────────
    with NovaAct(
        starting_page="https://example.com",
        headless=False,          # visible browser window
    ) as nova:

        # ── Step 1: Extract the page title ────────────────────────────────────
        print("\n▶ Step 1: Extract the page title")
        title_result = nova.act_get(
            "What is the page title shown in the browser tab or <title> tag?",
            schema=STRING_SCHEMA,
        )
        print(f"   Title: {title_result.response}")

        # ── Step 2: Extract the main heading ──────────────────────────────────
        print("\n▶ Step 2: Extract the main heading")
        heading_result = nova.act_get(
            "What is the main <h1> heading on this page?",
            schema=STRING_SCHEMA,
        )
        print(f"   Heading: {heading_result.response}")

        # ── Step 3: Click the 'More information...' link ──────────────────────
        print("\n▶ Step 3: Click the 'More information...' link")
        nova.act("click the 'More information...' link on the page")
        print("   Clicked — waiting for navigation...")

        # ── Step 4: Verify we landed on the IANA page ─────────────────────────
        print("\n▶ Step 4: Verify we are on the IANA page")
        on_iana = nova.act_get(
            "Is this page about IANA (Internet Assigned Numbers Authority) "
            "or domain name administration?",
            schema=BOOL_SCHEMA,
        )
        print(f"   On IANA page: {on_iana.parsed_response}")
        assert on_iana.parsed_response, "Expected to land on the IANA page!"

        # ── Step 5: Extract structured data with Pydantic schema ──────────────
        print("\n▶ Step 5: Extract structured page summary")
        summary_result = nova.act_get(
            "Extract: the page title, the organisation name, "
            "the main purpose of this organisation, "
            "and whether there is contact information on the page.",
            schema=PageSummary.model_json_schema(),
        )

        if summary_result.matches_schema:
            summary = PageSummary.model_validate(summary_result.parsed_response)
            print(f"   Organisation : {summary.organisation_name}")
            print(f"   Page title   : {summary.page_title}")
            print(f"   Purpose      : {summary.main_purpose}")
            print(f"   Has contact  : {summary.has_contact_info}")
        else:
            # Fallback to raw response if schema didn't match
            print(f"   Raw response : {summary_result.response}")

        # ── Step 6: Count links on the page ───────────────────────────────────
        print("\n▶ Step 6: Count visible links")
        link_count = nova.act_get(
            "How many hyperlinks are visible on this page?",
            schema={"type": "integer"},
        )
        print(f"   Link count: {link_count.parsed_response}")

    # Browser closes automatically when the `with` block exits
    print("\n" + "=" * 55)
    print(" Demo complete! Browser closed cleanly.")
    print("=" * 55)


if __name__ == "__main__":
    main()
