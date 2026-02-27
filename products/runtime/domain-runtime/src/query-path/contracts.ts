import type { EffectKind } from "@gooi/capability-contracts/capability-port";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { DomainRuntimeMode } from "../execution-core/envelopes";

/**
 * Domain query handler contract.
 */
export interface DomainQueryHandler {
	/** Runs one deterministic query path. */
	readonly run: (input: {
		readonly entrypointId: string;
		readonly input: Readonly<Record<string, unknown>>;
		readonly principal: PrincipalContext;
		readonly ctx: {
			readonly invocationId: string;
			readonly traceId: string;
			readonly now: string;
			readonly mode: DomainRuntimeMode;
		};
	}) => Promise<{
		readonly ok: boolean;
		readonly output?: unknown;
		readonly error?: unknown;
		readonly observedEffects: readonly EffectKind[];
	}>;
}
