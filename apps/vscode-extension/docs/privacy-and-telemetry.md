# Gooi VS Code Extension Privacy and Telemetry

## Privacy posture

1. Initial release telemetry is disabled by default.
2. Extension features do not require telemetry to function.
3. Runtime-backed commands still enforce lockfile parity and trust policy checks regardless of telemetry state.

## User controls

1. Enable telemetry explicitly in settings:
   - `gooi.authoring.telemetryEnabled: true`
2. Disable telemetry at any time:
   - `gooi.authoring.telemetryEnabled: false`
3. Users can apply the setting at workspace or user scope using standard VS Code settings precedence.

## Operational guidance

1. Release validation should evaluate activation/error telemetry only for opted-in users.
2. Incident investigations must treat telemetry as optional support data, not a required control path.
