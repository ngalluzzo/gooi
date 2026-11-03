import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import type { Value } from "@gooi/kernel/types";

/** The input value does not match the edge's declared JSON Schema. */
export class InputError extends Error {
  override readonly name = "InputError";
}

const ajv = new Ajv({ allErrors: false });
const compiled = new WeakMap<object, ValidateFunction>();

function message(error: ErrorObject): string {
  if (error.keyword === "required")
    return `Missing field: ${error.params.missingProperty}`;
  if (error.keyword === "additionalProperties")
    return `Unexpected field: ${error.params.additionalProperty}`;
  const field = error.instancePath.replace(/^\//u, "").replaceAll("/", ".");
  return `${field || "Input"} ${error.message}`;
}

/** Check a value against a JSON Schema; throws InputError naming the first problem. */
export function checkInput(schema: Value, value: Value): void {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema))
    throw new TypeError("An input schema must be a JSON Schema object");
  let validate = compiled.get(schema);
  if (!validate) compiled.set(schema, (validate = ajv.compile(schema)));
  if (!validate(value)) throw new InputError(message(validate.errors![0]!));
}
