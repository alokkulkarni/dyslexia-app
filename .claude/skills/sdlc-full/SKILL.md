---
name: sdlc-full
description: >
  Run the full SDLC pipeline end-to-end via AgentCore: analysis → architecture
  → refinement → development → test → review. Each phase is gated — the
  pipeline stops if a validation gate fails. Use when starting a new feature
  from scratch or when asked to "run the full pipeline" or "run end-to-end SDLC".
when_to_use: >
  Use for greenfield features or complete pipeline runs. Not appropriate for
  targeted single-phase work — use the individual sdlc-* skills for that.
disable-model-invocation: true
allowed-tools: Read Write Grep Bash(git *)
---

## Full SDLC Pipeline (End-to-End)

Run all SDLC phases in sequence with GREEN/RED gate checks between each phase.

### Pre-flight context

```!
echo "Repository: $(basename $(git rev-parse --show-toplevel 2>/dev/null || echo 'unknown'))"
echo "Branch:     $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
echo "Session:    ${CLAUDE_SESSION_ID}"
echo "Feature/scope: $ARGUMENTS"
```

### Pipeline Execution

Run each phase in order. **At each phase gate, check `validation_status`.**
If `"RED"`, display the blocking issues and **stop immediately** — do not proceed to the next phase.

**Phase 1 — Analysis**
Call `sdlc_run` with `phase="analysis"`, `input="$ARGUMENTS"`.
Gate: validation_status must be `"GREEN"` before proceeding.

**Phase 2 — Architecture**
Call `sdlc_run` with `phase="architecture"`, passing Phase 1 output as `input`.
Gate: validation_status must be `"GREEN"` before proceeding.

**Phase 3 — Refinement (Backlog)**
Call `sdlc_run` with `phase="refinement"`, passing Phase 2 output as `input`.
Gate: validation_status must be `"GREEN"` before proceeding.

**Phase 4 — Development (Code Generation)**
Call `sdlc_run` with `phase="development"`, passing Phase 3 story list as `input`.
Gate: validation_status must be `"GREEN"` before proceeding.

**Phase 5 — Test**
Call `sdlc_run` with `phase="test"`, passing Phase 4 generated file list as `input`.
Gate: validation_status must be `"GREEN"` (coverage ≥ 80%) before proceeding.

**Phase 6 — Review**
Call `sdlc_run` with `phase="review"`, passing all changed files as `input`.
Gate: No CRITICAL or HIGH security findings.

### Final Report

After all phases complete, output a pipeline summary:
```
✅ SDLC Pipeline Complete
─────────────────────────
Analysis:     ✅ GREEN  (N requirements extracted)
Architecture: ✅ GREEN  (N components, N ADRs)
Refinement:   ✅ GREEN  (N epics, N stories)
Development:  ✅ GREEN  (N files generated)
Test:         ✅ GREEN  (coverage: N%)
Review:       ✅ PASSED (0 HIGH/CRITICAL findings)
```

All artefacts written to: `analysis/`, `architecture/`, `backlog/`, `review/`

---

*Note: `disable-model-invocation: true` — invoke explicitly with `/sdlc-full [feature description]`.*
