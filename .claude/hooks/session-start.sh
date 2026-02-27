#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote (web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

BUN_VERSION="1.3.9"
TOKEI_VERSION="12.1.2"

# ── Bun ───────────────────────────────────────────────────────────────────────
if ! command -v bun >/dev/null 2>&1; then
  echo "Installing Bun ${BUN_VERSION}..."
  curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash -s "bun-v${BUN_VERSION}"
else
  echo "Bun $(bun --version) already installed."
fi

# ── Tokei ─────────────────────────────────────────────────────────────────────
if ! command -v tokei >/dev/null 2>&1; then
  echo "Installing tokei ${TOKEI_VERSION}..."
  ARCH=$(uname -m)
  MUSL_TRIPLE="${ARCH}-unknown-linux-musl"
  curl -fsSL "https://github.com/XAMPPRocky/tokei/releases/download/v${TOKEI_VERSION}/tokei-${MUSL_TRIPLE}.tar.gz" \
    | tar -xz -C /usr/local/bin tokei
  chmod +x /usr/local/bin/tokei
  echo "tokei $(tokei --version) installed."
else
  echo "tokei $(tokei --version) already installed."
fi

# ── Semgrep ───────────────────────────────────────────────────────────────────
if ! command -v semgrep >/dev/null 2>&1; then
  echo "Installing semgrep..."
  pip install --break-system-packages --quiet cffi semgrep
  echo "semgrep $(semgrep --version) installed."
else
  echo "semgrep $(semgrep --version) already installed."
fi

# ── Project dependencies ───────────────────────────────────────────────────────
echo "Installing project dependencies..."
cd "${CLAUDE_PROJECT_DIR}"
bun install
