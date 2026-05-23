---
name: sdlc-test
description: >
  Run the SDLC Test phase via AgentCore. Generates unit tests, integration
  tests, and E2E test suites from the implementation, then runs them and
  reports coverage. Use when asked to generate tests, write test cases, run
  tests, or check coverage.
when_to_use: >
  Trigger after code generation or when the developer asks to "generate tests",
  "write unit tests", "create test cases", "run tests", or "check coverage".
allowed-tools: Read Write Grep Bash(npm test *) Bash(pytest *) Bash(mvn test *)
---

## SDLC Test Generation Phase

Generate and run tests for the current implementation via AgentCore.

### Pre-flight context

```!
echo "Repository: $(basename $(git rev-parse --show-toplevel 2>/dev/null || echo 'unknown'))"
echo "Test framework: $(cat package.json 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); scripts=d.get(\"scripts\",{}); print(scripts.get(\"test\",\"not configured\"))' 2>/dev/null || echo 'unknown')"
echo "Existing test files: $(find . -name '*.test.*' -o -name '*.spec.*' 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ') files"
echo "Source files: $(find src -name '*.ts' -o -name '*.js' -o -name '*.py' 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ') files"
```

### Steps

1. Call the `sdlc_run` MCP tool with:
   - `phase`: `"test"`
   - `input`: List of source files to test, or `$ARGUMENTS` if specific files/components given
   - `project_key`: Derive from repo name
   - `repo`: Repository name from pre-flight context
   - `session_id`: Use `${CLAUDE_SESSION_ID}`

2. Inform the developer: *"Generating tests via AgentCore Test Agent…"*

3. Write generated test files to the appropriate test directory.

4. Run the test suite using the detected test command from pre-flight context.

5. Report:
   - Tests generated (count by type: unit / integration / E2E)
   - Test pass/fail results
   - Coverage percentage
   - If coverage < 80%, flag which modules need more tests

6. If `validation_status` is `"RED"` (coverage gate failed) — block and display: *"⛔ Coverage gate FAILED — minimum 80% required."*
