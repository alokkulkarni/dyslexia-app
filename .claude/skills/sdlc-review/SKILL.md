---
name: sdlc-review
description: >
  Run the SDLC Review phase via AgentCore. Performs security audit, coding
  standards check, dependency CVE scanning, and test coverage validation on
  staged or changed files. Blocks merge if any gate fails. Use when asked to
  review, run security audit, check coding standards, or before merging a PR.
when_to_use: >
  Trigger before committing or merging, or when the developer asks to "review",
  "security audit", "check standards", "run pre-commit checks", or
  "validate before merge".
disable-model-invocation: true
allowed-tools: Read Grep Bash(git diff *) Bash(git log *)
---

## SDLC Review Phase

Security audit, coding standards, and coverage gate via AgentCore.

### Pre-flight context

```!
echo "Repository: $(basename $(git rev-parse --show-toplevel 2>/dev/null || echo 'unknown'))"
echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
echo "Staged files:"
git diff --cached --name-only 2>/dev/null || echo "  (none staged — will review last commit)"
echo ""
echo "Changed vs main/master:"
git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only origin/master...HEAD 2>/dev/null || echo "  (cannot determine)"
```

### Steps

1. Collect the list of files to review:
   - If files are staged (`git diff --cached`), use those
   - Otherwise use the diff vs main/master from pre-flight context
   - If `$ARGUMENTS` is provided, use that as the file list instead

2. Call the `sdlc_run` MCP tool with:
   - `phase`: `"review"`
   - `input`: Comma-separated list of changed files plus their full content
   - `project_key`: Derive from repo name
   - `repo`: Repository name from pre-flight context
   - `session_id`: Use `${CLAUDE_SESSION_ID}`

3. Inform the developer: *"Running security audit and standards check via AgentCore…"*

4. Parse the response and display issues by severity:
   - 🔴 **CRITICAL / HIGH** — display immediately; block merge
   - 🟡 **MEDIUM** — display with recommendation to fix
   - 🟢 **LOW / INFO** — display as advisory only

5. Final verdict:
   - Any CRITICAL or HIGH findings → *"⛔ Review FAILED — fix issues before merging"* (exit non-zero if used in a hook)
   - All clear → *"✅ Review PASSED — safe to merge"*

6. Write `review/review-report-$(date +%Y%m%d-%H%M).md` with the full report.

---

*Note: `disable-model-invocation: true` — this skill must be invoked explicitly
with `/sdlc-review`. Claude will not trigger it automatically to prevent
unintentional side effects in CI/commit flows.*
