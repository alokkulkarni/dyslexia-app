# Nova Act Examples

Two examples showing how to use Nova Act — one via the CLI, one via Python.
Both run with a **visible (headed) browser** so you can watch it work.

## Setup

### 1. Get an API Key
Go to https://nova.amazon.com/act?tab=dev_tools and generate a key.

### 2. Activate the virtual environment
```bash
source /Users/alokkulkarni/Documents/Development/dyslexia-app/nova-act-env/bin/activate
```

### 3. Set your API key
```bash
export NOVA_ACT_API_KEY="your_key_here"
```

Or store it permanently via the CLI setup:
```bash
act browser setup --api-key your_key_here
```

---

## Example 1 — CLI (`01_cli_example.sh`)

Uses the `act browser` CLI to automate a browser with shell commands.

```bash
chmod +x nova-act-examples/01_cli_example.sh
./nova-act-examples/01_cli_example.sh
```

What it does:
1. Opens `example.com` in a visible browser
2. Asks a question about the page
3. Extracts the title and links
4. Clicks "More information..." and navigates to IANA
5. Verifies the navigation succeeded
6. Takes a screenshot

---

## Example 2 — Python Script (`02_python_example.py`)

Uses the `nova_act` Python SDK for programmatic browser automation with structured data extraction.

```bash
python nova-act-examples/02_python_example.py
```

What it does:
1. Opens `example.com` in a visible browser
2. Extracts the page title and heading
3. Clicks "More information..." to navigate to IANA
4. Verifies the navigation with a boolean check
5. Extracts structured data using a **Pydantic schema**
6. Counts links on the page

---

## Key Concepts

| Concept | CLI | Python |
|---------|-----|--------|
| Multi-step actions | `act browser execute "1. ... 2. ..."` | `nova.act("...")` |
| Extract data | `act browser extract "..." --schema string` | `nova.act_get("...", schema=...)` |
| Ask a question | `act browser ask "..."` | `nova.act_get("...", schema=STRING_SCHEMA)` |
| Verify condition | `act browser verify "..."` | `nova.act_get("...", schema=BOOL_SCHEMA)` |
| Structured output | `--schema list/string` | Pydantic `BaseModel.model_json_schema()` |
| Headed browser | `--headed` | `headless=False` |

## Session Management (CLI)

```bash
# List active sessions
act browser session list

# Export session history
act browser session export --session-id demo --format yaml -o session.yaml

# Generate a visual report
act browser session export --report --output-dir ./report --session-id demo

# Clean up old sessions
act browser session prune
```
