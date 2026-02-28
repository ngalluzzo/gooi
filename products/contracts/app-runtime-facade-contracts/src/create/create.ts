import type {
	CompiledEntrypointBundle,
	CompiledEntrypointKind,
} from "@gooi/app-spec-contracts/compiled";
import type { HostPortSet } from "@gooi/host-contracts/portset";
import {
	type PrincipalContext,
	principalContracts,
} from "@gooi/host-contracts/principal";
import type { HostReplayStorePort } from "@gooi/host-contracts/replay";
import type { KernelSemanticRuntimePort } from "@gooi/kernel-contracts/semantic-engine";
import type { BindingPlan } from "@gooi/marketplace-contracts/binding-plan";
import type { ResultEnvelope } from "@gooi/surface-contracts/envelope";
import { z } from "zod";
import type {
	AppRuntimeReachabilityOutcome,
	AppRuntimeReachabilityQuery,
} from "../reachability/reachability";

export type {
	AppRuntimeReachabilityOutcome,
	AppRuntimeReachabilityQuery,
} from "../reachability/reachability";

export const appRuntimeEntrypointKindSchema = z.enum(["query", "mutation"]);

export type AppRuntimeEntrypointKind = z.infer<
	typeof appRuntimeEntrypointKindSchema
>;

export const appRuntimeInvokeInputSchema = z.object({
	surfaceId: z.string().min(1),
	entrypointKind: appRuntimeEntrypointKindSchema,
	entrypointId: z.string().min(1),
	payload: z.record(z.string(), z.unknown()),
	principal: principalContracts.principalContextSchema,
	idempotencyKey: z.string().min(1).optional(),
	replayTtlSeconds: z.number().int().positive().optional(),
	invocationId: z.string().min(1).optional(),
	traceId: z.string().min(1).optional(),
	now: z.string().min(1).optional(),
});

export type AppRuntimeInvokeInput = z.infer<typeof appRuntimeInvokeInputSchema>;

export interface AppRuntimeInvocationMeasurement {
	readonly surfaceId: string;
	readonly entrypointKind: CompiledEntrypointKind;
	readonly entrypointId: string;
	readonly bindingMatched: boolean;
	readonly overheadMs: number;
}

export interface CreateAppRuntimeInput {
	readonly bundle: CompiledEntrypointBundle;
	readonly domainRuntime: KernelSemanticRuntimePort;
	readonly hostPorts: HostPortSet<
		PrincipalContext,
		ResultEnvelope<unknown, unknown>
	>;
	readonly bindingPlan?: BindingPlan;
	readonly replayStore?: HostReplayStorePort<ResultEnvelope<unknown, unknown>>;
	readonly replayTtlSeconds?: number;
	readonly now?: string;
	readonly onInvokeMeasured?: (
		measurement: AppRuntimeInvocationMeasurement,
	) => void;
}

export interface AppRuntime {
	readonly invoke: (
		input: AppRuntimeInvokeInput,
	) => Promise<ResultEnvelope<unknown, unknown>>;
	readonly describeReachability: (
		query: AppRuntimeReachabilityQuery,
	) => AppRuntimeReachabilityOutcome;
}

export const parseAppRuntimeInvokeInput = (
	value: unknown,
): AppRuntimeInvokeInput => appRuntimeInvokeInputSchema.parse(value);

export const parsePrincipalContext = (value: unknown): PrincipalContext =>
	principalContracts.principalContextSchema.parse(value);
