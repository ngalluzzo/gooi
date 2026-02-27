import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { CompiledEntrypoint } from "@gooi/spec-compiler/contracts";
import { idempotencyScopeKey } from "../errors/errors";
import type { RunEntrypointInput as SharedRunEntrypointInput } from "../types/types";

interface InvocationMetaInput {
	readonly bundle: SharedRunEntrypointInput["bundle"];
	readonly binding: SharedRunEntrypointInput["binding"];
	readonly principal: SharedRunEntrypointInput["principal"];
	readonly idempotencyKey?: string | undefined;
	readonly invocationId?: string;
	readonly traceId?: string;
	readonly now?: string;
}

export interface MutationReplayInput {
	readonly entrypoint: CompiledEntrypoint;
	readonly principal: PrincipalContext;
	readonly idempotencyKey: string;
	readonly input: Readonly<Record<string, unknown>>;
}

export const defaultReplayTtlSeconds = 300;

export const isValidReplayTtlSeconds = (value: number): boolean =>
	Number.isInteger(value) && value > 0;

export const buildInvocationMeta = (input: InvocationMetaInput) => ({
	binding: input.binding,
	principal: input.principal,
	...(input.idempotencyKey === undefined
		? {}
		: { idempotencyKey: input.idempotencyKey }),
	...(input.invocationId === undefined
		? {}
		: { invocationId: input.invocationId }),
	...(input.traceId === undefined ? {} : { traceId: input.traceId }),
	...(input.now === undefined ? {} : { now: input.now }),
});

export const resolveMutationReplayScope = (args: MutationReplayInput): string =>
	idempotencyScopeKey(args.entrypoint, args.principal, args.idempotencyKey);
