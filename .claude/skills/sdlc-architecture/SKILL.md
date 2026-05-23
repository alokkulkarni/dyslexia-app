---
name: sdlc-architecture
description: >
  Run the SDLC Architecture phase via AgentCore. Generates a High-Level Design
  (HLD), component diagram, Architecture Decision Records (ADRs), and a
  technology stack recommendation. Use after a successful analysis phase, or
  when asked to design the architecture, generate HLD, or create ADRs.
when_to_use: >
  Trigger after analysis phase validation passes, or when the developer asks to
  "design", "generate architecture", "create HLD", "write ADRs", or
  "recommend tech stack".
allowed-tools: Read Write Grep
---

## SDLC Architecture Phase

Generate the architecture artefacts for this project via AgentCore.

### Pre-flight context

```!
echo "Repository: $(basename $(git rev-parse --show-toplevel 2>/dev/null || echo 'unknown'))"
echo "Branch:     $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
echo "Analysis report exists: $(test -f analysis/source-code-report.json && echo 'YES — will be used as input' || echo 'NO — run sdlc-analyse first')"
```

### Steps

1. If `analysis/source-code-report.json` exists, read its content and include the
   extracted requirements as the `input` value.

2. Call the `sdlc_run` MCP tool with:
   - `phase`: `"architecture"`
   - `input`: Requirements from analysis report, or `$ARGUMENTS` if provided
   - `project_key`: Derive from the repo name (uppercase, max 10 chars)
   - `repo`: Repository name from pre-flight context
   - `session_id`: Use `${CLAUDE_SESSION_ID}`

3. Inform the developer: *"Generating architecture via AgentCore…"*

4. When complete, check `validation_status`. If `"RED"` — stop and display issues.

5. Write output files:
   - `architecture/hld.md` — High-Level Design document
   - `architecture/component-diagram.mmd` — Mermaid component diagram
   - `architecture/adrs/` — Individual ADR files (one per decision)
   - `architecture/tech-stack.md` — Technology recommendations with rationale

6. Display a summary: components identified, ADRs created, key decisions made.
