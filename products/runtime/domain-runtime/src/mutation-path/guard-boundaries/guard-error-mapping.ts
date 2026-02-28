import type {
	GuardErrorCode,
	GuardTypedError,
} from "@gooi/guard-contracts/errors";
import type { DomainRuntimeErrorCode } from "../../execution-core/errors";
import { createDomainRuntimeError } from "../../execution-core/errors";

const guardCodeMap: Partial<Record<GuardErrorCode, DomainRuntimeErrorCode>> = {
	collection_invariant_error: "collection_invariant_error",
	action_guard_error: "action_guard_error",
	signal_guard_error: "signal_guard_error",
	flow_guard_error: "flow_guard_error",
};

/**
 * Maps guard-runtime typed errors into domain-runtime typed errors.
 */
export const toDomainGuardError = (
	error: GuardTypedError,
	fallbackCode: DomainRuntimeErrorCode,
) =>
	createDomainRuntimeError(
		guardCodeMap[error.code] ?? fallbackCode,
		error.message,
		{
			sourceRef: error.sourceRef,
			...(error.details === undefined ? {} : { guardDetails: error.details }),
		},
	);
