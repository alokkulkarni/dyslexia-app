---
name: sdlc-codegen
description: >
  Run the SDLC Development phase via AgentCore. Generates code stubs,
  scaffolding, boilerplate, and implementation from user stories and
  architecture artefacts. Use when asked to generate code, scaffold the
  project, create boilerplate, or implement stories.
when_to_use: >
  Trigger after backlog refinement, or when the developer asks to "generate
  code", "scaffold", "create boilerplate", "implement", or "code up the stories".
allowed-tools: Read Write Grep Bash(git *)
---

## SDLC Development / Code Generation Phase

Generate code implementation from architecture and backlog via AgentCore.

### Pre-flight context

```!
echo "Repository: $(basename $(git rev-parse --show-toplevel 2>/dev/null || echo 'unknown'))"
echo "Language/framework: $(cat package.json 2>/dev/null | python3 -c 'import sys,json; d=json.load(sys.stdin); print(\"Node.js \" + d.get(\"engines\",{}).get(\"node\",\"?\"))' 2>/dev/null || cat requirements.txt 2>/dev/null | head -3 || cat pom.xml 2>/dev/null | grep -m1 '<artifactId>' || echo 'unknown')"
echo "Architecture HLD: $(test -f architecture/hld.md && echo 'EXISTS' || echo 'NOT FOUND')"
echo "Stories summary: $(test -f backlog/stories-summary.md && echo 'EXISTS' || echo 'NOT FOUND')"
```

### Steps

1. Read architecture and backlog files if available.

2. Call the `sdlc_run` MCP tool with:
   - `phase`: `"development"`
   - `input`: Story IDs or feature description to implement, plus pre-flight context. Use `$ARGUMENTS` if provided.
   - `project_key`: Derive from repo name
   - `repo`: Repository name from pre-flight context
   - `session_id`: Use `${CLAUDE_SESSION_ID}`

3. Inform the developer: *"Generating code via AgentCore Development Agent…"*

4. When complete, apply generated code to the working tree:
   - Create new files as specified in the agent response
   - Do NOT overwrite existing files with content — append or suggest merges

5. Display a summary: files created, components scaffolded, next steps.
