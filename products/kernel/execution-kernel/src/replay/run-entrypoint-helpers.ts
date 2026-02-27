import type { CompiledEntrypoint } from "@gooi/app-spec-contracts/compiled";
import type { PrincipalContext } from "@gooi/host-contracts/principal";
import type { RunEntrypointInput } from "../entrypoint/types";
import { idempotencyScopeKey } from "../errors/errors";

interface InvocationMetaInput {
	readonly bundle: RunEntrypointInput["bundle"];
	readonly binding: RunEntrypointInput["binding"];
	readonly principal: RunEntrypointInput["principal"];
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
