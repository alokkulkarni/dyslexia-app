---
name: sdlc-backlog
description: >
  Run the SDLC Refinement phase via AgentCore. Generates JIRA epics, user
  stories, and acceptance criteria from architecture artefacts. Creates tickets
  in JIRA via the MCP Gateway. Use when asked to create backlog, generate
  stories, refine requirements, or populate JIRA.
when_to_use: >
  Trigger after architecture phase, or when the developer asks to "create
  backlog", "generate stories", "populate JIRA", "write user stories", or
  "refine requirements".
allowed-tools: Read Write Grep
---

## SDLC Refinement / Backlog Generation Phase

Generate JIRA epics and user stories from architecture artefacts via AgentCore.

### Pre-flight context

```!
echo "Repository: $(basename $(git rev-parse --show-toplevel 2>/dev/null || echo 'unknown'))"
echo "Architecture HLD: $(test -f architecture/hld.md && echo 'EXISTS' || echo 'MISSING — run sdlc-architecture first')"
echo "Component diagram: $(test -f architecture/component-diagram.mmd && echo 'EXISTS' || echo 'MISSING')"
```

### Steps

1. Read `architecture/hld.md` and `architecture/component-diagram.mmd` if they exist.
   Include them in the `input` field.

2. Call the `sdlc_run` MCP tool with:
   - `phase`: `"refinement"`
   - `input`: HLD content + component list, or `$ARGUMENTS` if provided
   - `project_key`: Derive from repo name (uppercase, max 10 chars) — this becomes the JIRA project key
   - `repo`: Repository name from pre-flight context
   - `session_id`: Use `${CLAUDE_SESSION_ID}`

3. Inform the developer: *"Generating backlog and creating JIRA tickets via AgentCore…"*

4. The agent uses the JIRA MCP Server (registered in AgentCore MCP Gateway) to create:
   - Epics (one per architecture component/domain)
   - User stories (with acceptance criteria in Gherkin format)
   - Sub-tasks (for technical implementation items)

5. When complete, display:
   - Number of epics created
   - Number of stories created
   - JIRA project URL if available in the response

6. Write `backlog/stories-summary.md` with the generated story list for local reference.
