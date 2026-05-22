"""
AWS-style architecture diagram — Dyslexia Flashcards App
All connectors are perfectly straight (rad=0). Diagonal lines are used
where source and target are not axis-aligned; elbow waypoints are drawn
manually using ax.plot() for the few paths that need a 90-degree bend.
"""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
from matplotlib.offsetbox import OffsetImage, AnnotationBbox
from PIL import Image
import numpy as np

ICON_BASE = "/opt/homebrew/lib/python3.14/site-packages/resources/aws"

def icon(cat, f):
    return os.path.join(ICON_BASE, cat, f)

ICONS = {
    "user":       icon("general",    "user.png"),
    "cloudfront": icon("network",    "cloudfront.png"),
    "s3_web":     icon("storage",    "simple-storage-service-s3.png"),
    "cognito":    icon("security",   "cognito.png"),
    "apigw":      icon("network",    "api-gateway.png"),
    "lambda":     icon("compute",    "lambda.png"),
    "s3_docs":    icon("storage",    "simple-storage-service-s3-bucket.png"),
    "dynamodb":   icon("database",   "dynamodb.png"),
    "bedrock":    icon("ml",         "bedrock.png"),
    "cloudwatch": icon("management", "cloudwatch.png"),
}

# AWS colour palette
C_INK    = "#232F3E"
C_WHITE  = "#FFFFFF"
C_ARROW  = "#545B64"
C_DASH   = "#AAAAAA"

C_EDGE_F   = "#EEF2FF"
C_AUTH_F   = "#FFF7ED"
C_API_F    = "#F0FFF4"
C_LAMB_F   = "#FFFBEB"
C_STORE_F  = "#F0FDFA"
C_AI_F     = "#FAF5FF"
C_OBS_F    = "#F0F9FF"

FIG_W, FIG_H = 24, 30
fig, ax = plt.subplots(figsize=(FIG_W, FIG_H))
ax.set_xlim(0, FIG_W)
ax.set_ylim(0, FIG_H)
ax.axis("off")
fig.patch.set_facecolor(C_WHITE)
ax.set_facecolor(C_WHITE)

# ── helpers ────────────────────────────────────────────────────────────────

def place_icon(x, y, key, zoom=0.30):
    img = Image.open(ICONS[key]).convert("RGBA")
    ab = AnnotationBbox(OffsetImage(np.array(img), zoom=zoom),
                        (x, y), frameon=False, box_alignment=(0.5, 0.5), zorder=3)
    ax.add_artist(ab)

def node(x, y, key, label, sub="", zoom=0.30):
    place_icon(x, y, key, zoom)
    ax.text(x, y - 0.70, label, ha="center", va="top",
            fontsize=8.5, fontweight="bold", color=C_INK,
            multialignment="center", zorder=4)
    if sub:
        ax.text(x, y - 1.10, sub, ha="center", va="top",
                fontsize=7, color="#555555", multialignment="center", zorder=4)

def box(x, y, w, h, label, fill, lw=1.3):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                                boxstyle="round,pad=0.08",
                                linewidth=lw, edgecolor=C_INK,
                                facecolor=fill, zorder=0))
    ax.text(x + 0.2, y + h - 0.08, label, ha="left", va="top",
            fontsize=8, fontweight="bold", color=C_INK, zorder=1)

def straight_arrow(x0, y0, x1, y1, label="", color=C_ARROW, lw=1.5, dashed=False):
    """Draw a perfectly straight arrow from (x0,y0) to (x1,y1)."""
    ls = (0, (4, 3)) if dashed else "solid"
    ax.annotate("", xy=(x1, y1), xytext=(x0, y0),
                arrowprops=dict(
                    arrowstyle="-|>",
                    color=color, lw=lw,
                    linestyle=ls,
                    connectionstyle="arc3,rad=0",   # rad=0 → straight line
                ), zorder=5)
    if label:
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        ax.text(mx, my, label, ha="center", va="center",
                fontsize=7, color=C_INK, zorder=6,
                bbox=dict(boxstyle="round,pad=0.18", fc=C_WHITE, ec="none", alpha=0.9))

def elbow_arrow(x0, y0, x1, y1, label="", color=C_ARROW, lw=1.5, dashed=False):
    """
    Draw an L-shaped (elbow) connector: horizontal then vertical.
    Goes right/left from (x0,y0) to x1, then up/down to (x1,y1).
    Arrowhead placed at the end.
    """
    ls = (0, (4, 3)) if dashed else "solid"
    # draw the two segments
    ax.plot([x0, x1], [y0, y0], color=color, lw=lw, linestyle=ls, zorder=5)
    ax.annotate("", xy=(x1, y1), xytext=(x1, y0),
                arrowprops=dict(
                    arrowstyle="-|>",
                    color=color, lw=lw,
                    linestyle=ls,
                    connectionstyle="arc3,rad=0",
                ), zorder=5)
    if label:
        mx = (x0 + x1) / 2
        my = (y0 + y1) / 2
        ax.text(mx, my, label, ha="center", va="center",
                fontsize=7, color=C_INK, zorder=6,
                bbox=dict(boxstyle="round,pad=0.18", fc=C_WHITE, ec="none", alpha=0.9))

# ══════════════════════════════════════════════════════════════════════════
# NODE POSITIONS
# Canvas 24 × 30, origin bottom-left, rows top→bottom
#
#  y=28.2  title
#  y=26.0  User
#  y=22.8  CloudFront (x=5)   |  Cognito (x=19)
#  y=19.2  S3 Web     (x=5)   |  API GW  (x=19)
#  y=14.8  Lambda ×4  (x=3,8,14,20)
#  y= 9.5  S3 Docs (x=5) | DynamoDB (x=12) | Bedrock (x=20)
#  y= 4.5  CloudWatch (x=12)
# ══════════════════════════════════════════════════════════════════════════

# Title
ax.text(FIG_W/2, 29.0, "Dyslexia Flashcards App — AWS Architecture",
        ha="center", va="center", fontsize=17, fontweight="bold", color=C_INK)
ax.text(FIG_W/2, 28.4, "Serverless · AWS SAM · eu-west-2",
        ha="center", va="center", fontsize=10, color="#666666")

# ── User ──────────────────────────────────────────────────────────────────
UX, UY = 12.0, 26.2
node(UX, UY, "user", "User", "React SPA (Browser)", zoom=0.32)

# ── Edge & CDN ────────────────────────────────────────────────────────────
box(1.0, 20.5, 8.5, 4.0, "Edge & CDN", C_EDGE_F)
CFX, CFY = 5.25, 22.8
node(CFX, CFY, "cloudfront", "Amazon CloudFront",
     "HTTPS · Security Headers · OAC")

# ── Authentication ────────────────────────────────────────────────────────
box(14.5, 20.5, 8.5, 4.0, "Authentication", C_AUTH_F)
CGX, CGY = 18.75, 22.8
node(CGX, CGY, "cognito", "Amazon Cognito",
     "User Pool · JWT · Email verify")

# ── Frontend Hosting ──────────────────────────────────────────────────────
box(1.0, 16.5, 8.5, 3.5, "Frontend Hosting", C_STORE_F)
S3WX, S3WY = 5.25, 18.4
node(S3WX, S3WY, "s3_web", "S3 — Frontend Bucket",
     "Static assets · No public access")

# ── API Layer ─────────────────────────────────────────────────────────────
box(14.5, 16.5, 8.5, 3.5, "API Layer", C_API_F)
AGX, AGY = 18.75, 18.4
node(AGX, AGY, "apigw", "Amazon API Gateway",
     "Cognito Authorizer · 50 rps · 100 burst")

# ── Lambda ────────────────────────────────────────────────────────────────
box(1.0, 11.2, 22.0, 5.5,
    "AWS Lambda Functions  (arm64 · Node.js 20 · X-Ray Active Tracing)", C_LAMB_F)
L1X, L2X, L3X, L4X = 3.2, 8.2, 14.0, 19.8
LY = 14.0
node(L1X, LY, "lambda", "AuthFunction",
     "POST /auth/signup\nPOST /auth/confirm\nPOST /auth/login", zoom=0.27)
node(L2X, LY, "lambda", "UploadFunction",
     "POST /document/upload\n256 MB", zoom=0.27)
node(L3X, LY, "lambda", "GenerateFunction",
     "POST /flashcards/generate\n1 GB · 60 s · concurrency 20", zoom=0.27)
node(L4X, LY, "lambda", "GetFlashcardsFunction",
     "GET /flashcards · 256 MB", zoom=0.27)

# ── Storage ───────────────────────────────────────────────────────────────
box(1.0, 5.5, 16.0, 5.2, "Storage", C_STORE_F)
S3DX, S3DY = 5.0, 8.2
node(S3DX, S3DY, "s3_docs", "S3 — Documents Bucket",
     "AES-256 · user-scoped keys\nNo public access")
DBX, DBY = 13.0, 8.2
node(DBX, DBY, "dynamodb", "Amazon DynamoDB",
     "DyslexiaFlashcards\nPAY_PER_REQUEST · PITR")

# ── Generative AI ─────────────────────────────────────────────────────────
box(18.0, 5.5, 5.5, 5.2, "Generative AI", C_AI_F)
BRX, BRY = 20.75, 8.2
node(BRX, BRY, "bedrock", "Amazon Bedrock",
     "Claude 3 Haiku\nInvokeModel API", zoom=0.32)

# ── Observability ─────────────────────────────────────────────────────────
box(8.5, 0.6, 7.0, 4.4, "Observability", C_OBS_F)
CWX, CWY = 12.0, 3.0
node(CWX, CWY, "cloudwatch", "CloudWatch + X-Ray",
     "Active tracing · All Lambda functions")

# ══════════════════════════════════════════════════════════════════════════
# CONNECTORS — all straight lines, rad=0
# ══════════════════════════════════════════════════════════════════════════

# 1  User → CloudFront  (diagonal straight)
straight_arrow(UX - 0.4, UY - 1.5, CFX + 0.1, CFY + 0.65, "HTTPS GET (React SPA)")

# 2  CloudFront → S3 Web  (vertical straight)
straight_arrow(CFX, CFY - 0.65, S3WX, S3WY + 0.65, "OAC SigV4")

# 3  User → Cognito  (diagonal straight)
straight_arrow(UX + 0.4, UY - 1.5, CGX - 0.1, CGY + 0.65, "Sign-up / Login")

# 4  User → API Gateway  (diagonal straight)
straight_arrow(UX + 0.7, UY - 1.5, AGX - 0.2, AGY + 0.65, "REST API (JWT Bearer)")

# 5  API GW → AuthFunction  (elbow: go left then down)
elbow_arrow(AGX - 1.0, AGY - 0.65, L1X, LY + 0.75, "PUBLIC /auth/*")

# 6  AuthFunction → Cognito  (diagonal straight)
straight_arrow(L1X + 0.4, LY + 0.75, CGX - 0.5, CGY - 0.65, "Cognito SDK")

# 7  API GW → UploadFunction  (elbow: go left then down)
elbow_arrow(AGX - 0.5, AGY - 0.65, L2X, LY + 0.75, "POST /document/upload")

# 8  API GW → GenerateFunction  (vertical straight — nearly aligned)
straight_arrow(AGX - 0.3, AGY - 0.65, L3X + 0.3, LY + 0.75, "POST /flashcards/generate")

# 9  API GW → GetFlashcardsFunction  (vertical straight — nearly aligned)
straight_arrow(AGX + 0.2, AGY - 0.65, L4X - 0.1, LY + 0.75, "GET /flashcards")

# 10 UploadFunction → S3 Docs  (vertical straight)
straight_arrow(L2X, LY - 0.85, S3DX, S3DY + 0.65, "PutObject")

# 11 GenerateFunction → S3 Docs  (diagonal straight)
straight_arrow(L3X - 0.5, LY - 0.85, S3DX + 0.5, S3DY + 0.65, "GetObject (PDF/TXT)")

# 12 GenerateFunction → DynamoDB  (diagonal straight)
straight_arrow(L3X + 0.2, LY - 0.85, DBX - 0.2, DBY + 0.65, "PutItem (deck + cards)")

# 13 GenerateFunction → Bedrock  (diagonal straight)
straight_arrow(L3X + 0.6, LY - 0.85, BRX - 0.5, BRY + 0.65, "InvokeModel (Claude 3 Haiku)")

# 14 GetFlashcardsFunction → DynamoDB  (diagonal straight)
straight_arrow(L4X - 0.5, LY - 0.85, DBX + 0.5, DBY + 0.65, "Query (userId)")

# 15 All Lambdas → CloudWatch  (dashed straight)
for lx in [L1X, L2X, L3X, L4X]:
    straight_arrow(lx, LY - 0.85, CWX, CWY + 0.65,
                   color=C_DASH, lw=1.1, dashed=True)
ax.text(CWX - 3.2, (LY - 0.85 + CWY + 0.65) / 2,
        "Traces & Logs", fontsize=7, color="#888888", ha="center", va="center",
        bbox=dict(boxstyle="round,pad=0.15", fc=C_WHITE, ec="none", alpha=0.85), zorder=6)

# ── Legend ─────────────────────────────────────────────────────────────────
legend_items = [
    mpatches.Patch(facecolor=C_EDGE_F,  edgecolor=C_INK, label="Edge & CDN"),
    mpatches.Patch(facecolor=C_AUTH_F,  edgecolor=C_INK, label="Authentication"),
    mpatches.Patch(facecolor=C_API_F,   edgecolor=C_INK, label="API Layer"),
    mpatches.Patch(facecolor=C_LAMB_F,  edgecolor=C_INK, label="Compute (Lambda)"),
    mpatches.Patch(facecolor=C_STORE_F, edgecolor=C_INK, label="Storage"),
    mpatches.Patch(facecolor=C_AI_F,    edgecolor=C_INK, label="Generative AI"),
    mpatches.Patch(facecolor=C_OBS_F,   edgecolor=C_INK, label="Observability"),
]
ax.legend(handles=legend_items, loc="lower left", bbox_to_anchor=(0.0, 0.0),
          fontsize=8, framealpha=0.95, edgecolor=C_INK, facecolor=C_WHITE,
          title="Groups", title_fontsize=8)

out = "docs/dyslexia_aws_architecture.png"
plt.savefig(out, dpi=180, bbox_inches="tight", facecolor=C_WHITE, edgecolor="none")
plt.close()
print(f"Saved → {out}")
