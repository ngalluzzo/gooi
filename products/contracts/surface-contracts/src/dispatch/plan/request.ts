import {
	type JsonObject,
	jsonObjectSchema,
} from "@gooi/contract-primitives/json";
import { principalContextSchema } from "@gooi/host-contracts/principal";
import { z } from "zod";
import { dispatchInvocationHostSchema } from "../context/dispatch-context";

/**
 * Runtime schema for one dispatch request.
 */
export const dispatchRequestSchema = z
	.object({
		surfaceId: z.string().min(1),
		surfaceType: z.string().min(1),
		invocationHost: dispatchInvocationHostSchema,
		attributes: jsonObjectSchema,
		payload: jsonObjectSchema.optional(),
		principal: principalContextSchema.optional(),
		authContext: jsonObjectSchema.optional(),
	})
	.strict();

type ParsedDispatchRequest = z.infer<typeof dispatchRequestSchema>;

/**
 * One dispatch request payload.
 */
export type DispatchRequest = Omit<
	ParsedDispatchRequest,
	"payload" | "authContext"
> & {
	readonly payload?: JsonObject | undefined;
	readonly authContext?: JsonObject | undefined;
};

/**
 * Parses one untrusted dispatch request payload.
 */
export const parseDispatchRequest = (value: unknown): DispatchRequest =>
	dispatchRequestSchema.parse(value);
