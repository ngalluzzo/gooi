# Provider Publication Checklist

Use this checklist before publishing or updating a provider listing.

## Required Evidence

1. Provider manifest snapshot:
   - `providerId`, `providerVersion`, `hostApiRange`, and declared capabilities.
2. Capability contract compatibility evidence:
   - contract hashes and compatibility notes for additive vs breaking changes.
3. Host and replay conformance artifacts:
   - host aggregate conformance report artifact.
   - replay-store conformance report artifact.
   - each artifact must include `checks[].id` values from typed check-id contracts:
     - `@gooi/conformance/host-contracts`
     - `@gooi/conformance/replay-store-contracts`
4. Deterministic conformance evidence:
   - repeated run outputs are identical for check ordering and pass/fail results.
5. Security and trust evidence:
   - integrity/signing artifacts required by marketplace trust policy.

## Minimum Conformance Gate

Run conformance through the standard test suite path in CI:

```sh
bun -F @gooi/conformance test
```

Publication should be blocked when either host or replay-store conformance suite fails.
