import { z } from "zod";
import type { GuardSourceRef } from "../plans/guard-plan";

export const guardErrorCodeSchema = z.enum([
	"collection_invariant_error",
	"action_guard_error",
	"signal_guard_error",
	"flow_guard_error",
	"projection_guard_error",
	"semantic_guard_unavailable_error",
	"guard_policy_error",
]);

export type GuardErrorCode = z.infer<typeof guardErrorCodeSchema>;

export interface GuardTypedError {
	readonly code: GuardErrorCode;
	readonly message: string;
	readonly sourceRef: GuardSourceRef;
	readonly details?: Readonly<Record<string, unknown>>;
}

export const createGuardError = (
	code: GuardErrorCode,
	message: string,
	sourceRef: GuardSourceRef,
	details?: Readonly<Record<string, unknown>>,
): GuardTypedError => ({
	code,
	message,
	sourceRef,
	...(details === undefined ? {} : { details }),
});
