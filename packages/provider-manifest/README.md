# @gooi/provider-manifest

Shared provider manifest base primitives.

## Overview

`@gooi/provider-manifest` defines base manifest fields shared across provider manifest contracts:

- `providerId`: non-empty provider identity
- `providerVersion`: required semver (`MAJOR.MINOR.PATCH`)
- `hostApiRange`: non-empty runtime host API range

Parsing is deterministic for identical inputs, and `safeParse*` APIs return typed issues without throwing.

## Feature Entry Points

- `@gooi/provider-manifest/base`
