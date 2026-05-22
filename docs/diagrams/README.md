# Diagrams

Mermaid source files (`.mmd`) for all architecture diagrams in `ai-sdlc-factory-guide.md`.

Pre-rendered PNGs are in [`../images/`](../images/).

| File | Diagram | PNG |
|---|---|---|
| [`01-sdlc-factory-overview.mmd`](./01-sdlc-factory-overview.mmd) | SDLC Factory — Claude Code/GitHub Copilot → AgentCore → MCP Gateway + Sub-Agents | [`01-sdlc-factory-overview.png`](../images/01-sdlc-factory-overview.png) |
| [`02-enterprise-marketplace.mmd`](./02-enterprise-marketplace.mmd) | Enterprise AI App Marketplace — full 5-layer architecture | [`02-enterprise-marketplace.png`](../images/02-enterprise-marketplace.png) |
| [`03-marketplace-positioning.mmd`](./03-marketplace-positioning.mmd) | SDLC Factory position within the marketplace (Finance/Legal/HR Copilot interactions) | [`03-marketplace-positioning.png`](../images/03-marketplace-positioning.png) |
| [`04-bridge-security-architecture.mmd`](./04-bridge-security-architecture.mmd) | AgentCore Bridge MCP Server — enterprise security architecture (WAF, API Gateway, OIDC, VPC) | [`04-bridge-security-architecture.png`](../images/04-bridge-security-architecture.png) |
| [`05-sdlc-pipeline-flow.mmd`](./05-sdlc-pipeline-flow.mmd) | End-to-end SDLC pipeline flow with GREEN gates (Discovery → Refinement → Dev → Review) | [`05-sdlc-pipeline-flow.png`](../images/05-sdlc-pipeline-flow.png) |
| [`06-multicloud-model-routing.mmd`](./06-multicloud-model-routing.mmd) | Multi-cloud AI Models Hub — Bedrock (Claude), Azure OpenAI (GPT-4o), self-hosted routing | [`06-multicloud-model-routing.png`](../images/06-multicloud-model-routing.png) |
| [`07-skills-architecture.mmd`](./07-skills-architecture.mmd) | Three-layer skills model — how Claude Code/Copilot IDE skills map to AgentCore Action Groups | [`07-skills-architecture.png`](../images/07-skills-architecture.png) |

## Re-rendering PNGs

If you update a `.mmd` file, re-render with:

```bash
# Single diagram
mmdc -i diagrams/01-sdlc-factory-overview.mmd -o images/01-sdlc-factory-overview.png -t dark -b transparent --width 1400

# All diagrams
cd docs
for f in diagrams/*.mmd; do
  name=$(basename "$f" .mmd)
  mmdc -i "$f" -o "images/${name}.png" -t dark -b transparent --width 1400
done
```

Install the CLI if needed: `npm install -g @mermaid-js/mermaid-cli`

## Editing in VS Code

Install the [Mermaid Preview extension](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) to preview `.mmd` files live.

## Embedding in Documents

Each diagram has three formats in `ai-sdlc-factory-guide.md`:
1. **ASCII art** — always visible in plain text / terminal
2. **Mermaid code block** — rendered natively by GitHub, GitLab, Notion, Obsidian
3. **PNG image reference** — fallback for any Markdown renderer
