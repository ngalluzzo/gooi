# @gooi/scenario-runtime

Canonical scenario/persona runtime for trigger/expect/capture execution,
lockfile-backed generated inputs, suite reports, and persona coverage reporting.

## Features

- Deterministic scenario step execution against canonical runtime callbacks
- Trigger/expect/capture orchestration with typed failure taxonomy
- Persona-driven generated trigger inputs with lock snapshot replay by default
- Scenario suite execution with deterministic ordering and tag filtering
- Persona coverage report generation

## API

- `runScenario(input)`
- `runScenarioSuite(input)`
- `reportPersonaCoverage(input)`
