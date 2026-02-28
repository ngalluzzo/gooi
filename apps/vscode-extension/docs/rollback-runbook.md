# Gooi VS Code Extension Rollback Runbook

## Trigger conditions

1. Crash-free session rate below threshold.
2. Authoring flow regression in completion/diagnostics/rename.
3. Security or policy issue in published artifact.

## Rollback steps

1. Identify last known-good VSIX version.
2. Re-publish the prior VSIX:
   - `bunx @vscode/vsce publish --packagePath <prior-vsix-file> --pat "$VSCE_TOKEN"`
3. Announce rollback in release channel with incident reference.

## Validation

1. Re-run smoke checks on rolled-back version.
2. Confirm telemetry stabilizes for opted-in users.
3. Update incident log with root-cause and forward fix plan.
