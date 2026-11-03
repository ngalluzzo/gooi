import {
  artifact,
  observe,
  readClaim,
  readResult,
} from "@gooi/kernel/evidence";
import { compose } from "@gooi/kernel/compose";

const component = { id: "urn:example:component", version: 1 };
const inputs = { id: "urn:example:required-inputs", version: 1 };
const preservesInputs = { id: "urn:example:preserves-inputs", version: 1 };

const source = artifact(component, { tag: "h1", required: ["title"] });
const output = artifact(component, { tag: "h2", required: ["title"] });

// A domain reader derives these observations from each native artifact.
const before = observe(source, inputs, "component:summary", {
  required: ["title"],
});
const after = observe(output, inputs, "component:summary", {
  required: ["title"],
});
const result = readResult(
  {
    artifact: output,
    claims: [
      readClaim({
        contract: preservesInputs,
        scope: "Required input names",
        from: [before],
        to: [after],
        verdict: "passed",
        witness: { expected: ["title"], actual: ["title"] },
      }),
    ],
  },
  { input: component, output: component },
  source,
);

console.log(
  JSON.stringify(
    {
      sameObservation: before.id === after.id,
      sameArtifact: before.artifact === after.artifact,
      trace: compose([result])[0],
    },
    null,
    2,
  ),
);
