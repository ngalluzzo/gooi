# Gooi VS Code Extension Release Runbook

## Preconditions

1. CI is green on the release commit.
2. `@gooi/vscode-extension` tests pass locally.
3. Marketplace token is available as `VSCE_TOKEN`.

## Release steps

1. Build extension bundle:
   - `bun --filter gooi-vscode-extension build`
2. Package VSIX:
   - `bun --filter gooi-vscode-extension package:vsix`
3. Smoke check packaged output:
   - install VSIX locally in VS Code.
   - open fixture workspace with `.gooi/authoring-context.json`.
   - verify completion, diagnostics, and rename flows.
4. Publish:
   - `bunx @vscode/vsce publish --packagePath <vsix-file> --pat "$VSCE_TOKEN"`

## Post-release checks

1. Verify Marketplace listing is updated.
2. Validate activation and error telemetry for the new version.
3. Confirm no elevated crash-rate or latency alert in first 30 minutes.
