import { createAppRuntime } from "@gooi/app-runtime/create";
import type { CompiledEntrypointBundle } from "@gooi/app-spec-contracts/compiled";
import { createDomainRuntime } from "@gooi/domain-runtime";
import { clockContracts } from "@gooi/host-contracts/clock";
import { delegationContracts } from "@gooi/host-contracts/delegation";
import { identityContracts } from "@gooi/host-contracts/identity";
import { principalContracts } from "@gooi/host-contracts/principal";
import { replayContracts } from "@gooi/host-contracts/replay";
import { hostFail, hostOk } from "@gooi/host-contracts/result";
import type { BindingPlan } from "@gooi/marketplace-contracts/binding-plan";
import type { ResultEnvelope } from "@gooi/surface-contracts/envelope";

export interface CliRuntimeInput {
	readonly bundle: CompiledEntrypointBundle;
	readonly bindingPlan?: BindingPlan;
	readonly replayTtlSeconds?: number;
	readonly now?: string;
}

const createReplayStore = () => {
	const records = new Map<
		string,
		{
			readonly result: ResultEnvelope<unknown, unknown>;
			readonly inputHash: string;
		}
	>();
	return replayContracts.createHostReplayStorePort<
		ResultEnvelope<unknown, unknown>
	>({
		load: async (scopeKey: string) => records.get(scopeKey) ?? null,
		save: async (input: {
			readonly scopeKey: string;
			readonly record: {
				readonly inputHash: string;
				readonly result: ResultEnvelope<unknown, unknown>;
			};
			readonly ttlSeconds: number;
		}) => {
			records.set(input.scopeKey, {
				inputHash: input.record.inputHash,
				result: input.record.result,
			});
		},
	});
};

export const createDefaultCliHostPorts = () => ({
	clock: clockContracts.createSystemClockPort(),
	identity: identityContracts.createSystemIdentityPort({
		tracePrefix: "cli_trace_",
		invocationPrefix: "cli_invocation_",
	}),
	principal: principalContracts.createHostPrincipalPort({
		validatePrincipal: (value: unknown) => {
			const parsed = principalContracts.principalContextSchema.safeParse(value);
			if (!parsed.success) {
				return hostFail(
					"principal_validation_error",
					"Principal input failed validation.",
					{
						issues: parsed.error.issues.map((issue) => ({
							path: issue.path.join("."),
							message: issue.message,
						})),
					},
				);
			}
			return hostOk(parsed.data);
		},
	}),
	capabilityDelegation:
		delegationContracts.createFailingCapabilityDelegationPort(),
	replay: createReplayStore(),
});

export const createCliRuntime = (input: CliRuntimeInput) => {
	const domainRuntime = createDomainRuntime({
		domainRuntimeIR: input.bundle.domainRuntimeIR,
		sessionIR: input.bundle.sessionIR,
		capabilities: {},
	});

	return createAppRuntime({
		bundle: input.bundle,
		domainRuntime,
		hostPorts: createDefaultCliHostPorts(),
		...(input.bindingPlan === undefined
			? {}
			: { bindingPlan: input.bindingPlan }),
		...(input.replayTtlSeconds === undefined
			? {}
			: { replayTtlSeconds: input.replayTtlSeconds }),
		...(input.now === undefined ? {} : { now: input.now }),
	});
};
