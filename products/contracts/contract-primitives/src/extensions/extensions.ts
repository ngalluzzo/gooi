import { z } from "zod";
import { type JsonValue, jsonValueSchema } from "../json/json";

/**
 * Explicit extension-point payload wrapper.
 */
export interface ExtensionPayload<
	TPolicy extends string = string,
	TPayload extends JsonValue = JsonValue,
> {
	/** Policy identifier governing the extension slot. */
	readonly policy: TPolicy;
	/** Extension payload data governed by the policy. */
	readonly payload: TPayload;
}

/**
 * Builds a typed schema for explicit extension-point payloads.
 */
export const extensionPayloadSchema = <TPolicy extends string>(
	policySchema: z.ZodType<TPolicy>,
): z.ZodType<ExtensionPayload<TPolicy>> =>
	z.object({
		policy: policySchema,
		payload: jsonValueSchema,
	});

/**
 * Parses one extension-point payload.
 */
export const parseExtensionPayload = <TPolicy extends string>(
	value: unknown,
	policySchema: z.ZodType<TPolicy>,
): ExtensionPayload<TPolicy> =>
	extensionPayloadSchema(policySchema).parse(value);
