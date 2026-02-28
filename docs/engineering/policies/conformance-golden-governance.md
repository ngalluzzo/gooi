# Conformance Golden Governance Policy

This policy governs updates to committed golden artifacts used by conformance
and determinism gates.

## Scope

- Any file path containing `.golden.`.
- Any file path under a `golden` directory.

## Governance Rules

1. Golden changes require an explicit update record in
   `docs/engineering/golden-updates/`.
2. Every update record must include:
   - `Date`
   - `Approver`
   - `Contract Version`
   - `Justification`
   - explicit list of changed golden file paths
3. Golden drift without a valid update record is release-blocking.
4. Update records are immutable audit artifacts and must remain in git history.

## Enforcement

- Script: `bun run golden:governance`
- CI: executed in `.github/workflows/ci.yml`
- Release: executed in `.github/workflows/release.yml`

The gate fails when golden files changed but no compliant governance record is
present in the same change set.
