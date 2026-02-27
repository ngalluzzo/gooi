# @gooi/artifact-model

Deterministic lane-artifact, manifest, and optional packaged-bundle contracts.

## Features

- Canonical lane artifact records and `CompiledArtifactManifest@2.0.0`
- Typed manifest integrity/compatibility diagnostics
- Optional packaged bundle transport with verify/unpack diagnostics
- Optional trust-policy signature enforcement for certified/production paths

## Trust Policy Handoff

Manifest signatures remain optional in schema (`manifest.signatures?`), and
consumers can enforce signature requirements via trust policy without schema
changes.

```ts
import { validateArtifactManifest } from "@gooi/artifact-model/validation";

const validation = validateArtifactManifest({
  manifest,
  signaturePolicy: {
    profile: "production",
    requiredSignerIds: ["cosign"],
  },
});

if (!validation.ok) {
  // includes manifest_signature_missing_error / manifest_signature_policy_error
}
```
