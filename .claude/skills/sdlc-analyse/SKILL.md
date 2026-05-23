---
name: sdlc-analyse
description: >
  Run the SDLC Analysis phase via AgentCore. Scans the repository, extracts
  requirements from code and documentation, performs dependency auditing, and
  produces a validation-gated analysis report. Use when asked to analyse,
  analyse the repo, run requirements analysis, or start the SDLC pipeline.
when_to_use: >
  Trigger this skill when the developer asks to "analyse", "run analysis",
  "extract requirements", "check dependencies", or "start the pipeline".
  Also appropriate as the first step before architecture or backlog generation.
allowed-tools: Read Grep Bash(git *)
---

## SDLC Analysis Phase

Run the full analysis pipeline on this repository via the AgentCore Bridge.

### Pre-flight context

```!
echo "Repository: $(basename $(git rev-parse --show-toplevel 2>/dev/null || echo 'unknown'))"
echo "Branch:     $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
echo "Last commit: $(git log -1 --format='%h %s' 2>/dev/null || echo 'none')"
echo "Changed files (since last tag): $(git diff --name-only $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD) HEAD 2>/dev/null | head -20 || echo 'n/a')"
```

### Steps

1. Call the `sdlc_run` MCP tool with:
   - `phase`: `"analysis"`
   - `input`: Summary of what the developer wants to analyse (or full repo context if not specified)
   - `project_key`: Derive from the repository name — uppercase, max 10 chars (e.g. `DYSLEXIA`)
   - `repo`: Repository name from the pre-flight context above
   - `session_id`: Use `${CLAUDE_SESSION_ID}`

2. While the agent runs, inform the developer: *"Running SDLC Analysis via AgentCore — this may take 30–90 seconds…"*

3. When the result returns, parse the JSON response:
   - If `validation_status` is `"RED"` → display blocking issues clearly and **stop**. Do not proceed to architecture phase.
   - If `validation_status` is `"GREEN"` → confirm *"✅ Analysis complete — ready for architecture phase."*

4. Write output files locally:
   - `analysis/source-code-report.json` — full agent response JSON
   - `analysis/validation-status.md` — human-readable summary with date/branch

5. Display findings grouped as:
   - **Requirements extracted** (count + list)
   - **Documentation gaps** (files missing or outdated)
   - **Dependency risks** (CVEs, outdated packages)
   - **Code quality issues** (linting, complexity, test coverage)

### Arguments

If `$ARGUMENTS` is provided, use it as the `input` field instead of auto-deriving it.
