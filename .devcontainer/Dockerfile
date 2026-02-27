FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# ── Node.js 20 (for Docusaurus docs site) ─────────────────────────────────────
ARG NODE_VERSION=20
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Bun (pinned to match package.json) ────────────────────────────────────────
ARG BUN_VERSION=1.3.9
RUN curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash -s "bun-v${BUN_VERSION}"

# ── Python + Semgrep ──────────────────────────────────────────────────────────
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && apt-get clean && rm -rf /var/lib/apt/lists/* \
    && pip install --break-system-packages semgrep

# ── Tokei (for loc:check pre-commit hook) ─────────────────────────────────────
ARG TOKEI_VERSION=12.1.2
RUN ARCH=$(uname -m) \
    && MUSL_TRIPLE="${ARCH}-unknown-linux-musl" \
    && curl -fsSL "https://github.com/XAMPPRocky/tokei/releases/download/v${TOKEI_VERSION}/tokei-${MUSL_TRIPLE}.tar.gz" \
    | tar -xz -C /usr/local/bin tokei \
    && chmod +x /usr/local/bin/tokei
