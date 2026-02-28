import type {
	CompileDiagnostic,
	CompiledDomainActionPlan,
	CompiledDomainActionStepInputPlan,
	CompiledDomainActionStepPlan,
	CompiledDomainValueSource,
} from "@gooi/app-spec-contracts/compiled";
import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans";
import { asRecord, asString } from "./cross-links/shared";
import {
	domainRuntimeIRError,
	parseValueSource,
	sortRecord,
} from "./domain-runtime-ir-shared";

const parseStepInput = (input: {
	readonly actionId: string;
	readonly stepIndex: number;
	readonly value: unknown;
	readonly diagnostics: CompileDiagnostic[];
}): CompiledDomainActionStepInputPlan => {
	const inputPath = `domain.actions.${input.actionId}.steps.${input.stepIndex}.input`;
	const inputRecord = asRecord(input.value) ?? {};
	const fieldBindings = asRecord(inputRecord.fields) ?? {};
	const fields: Record<string, CompiledDomainValueSource> = {};
	for (const [fieldId, fieldValue] of Object.entries(fieldBindings).sort(
		([left], [right]) => left.localeCompare(right),
	)) {
		const parsed = parseValueSource(
			fieldValue,
			`${inputPath}.fields.${fieldId}`,
			input.diagnostics,
		);
		if (parsed !== undefined) {
			fields[fieldId] = parsed;
		}
	}
	const defaults = asRecord(inputRecord.defaults);
	return {
		fields,
		...(defaults === undefined ? {} : { defaults: sortRecord(defaults) }),
	};
};

const parseActionStep = (input: {
	readonly actionId: string;
	readonly stepIndex: number;
	readonly value: unknown;
	readonly diagnostics: CompileDiagnostic[];
}): CompiledDomainActionStepPlan | undefined => {
	const path = `domain.actions.${input.actionId}.steps.${input.stepIndex}`;
	const stepRecord = asRecord(input.value);
	const capabilityId = asString(stepRecord?.capabilityId);
	if (capabilityId === undefined) {
		input.diagnostics.push(
			domainRuntimeIRError(
				`${path}.capabilityId`,
				"Action step requires `capabilityId`.",
			),
		);
		return undefined;
	}
	const stepId = asString(stepRecord?.stepId) ?? `step_${input.stepIndex + 1}`;
	const invariants = Array.isArray(stepRecord?.invariants)
		? stepRecord.invariants.filter(
				(item): item is Readonly<Record<string, unknown>> =>
					asRecord(item) !== undefined,
			)
		: undefined;
	return {
		stepId,
		capabilityId,
		input: parseStepInput({
			actionId: input.actionId,
			stepIndex: input.stepIndex,
			value: stepRecord?.input,
			diagnostics: input.diagnostics,
		}),
		...(invariants === undefined
			? {}
			: {
					invariants:
						invariants as unknown as readonly CompiledInvariantDefinition[],
				}),
	};
};

export const parseActionPlan = (input: {
	readonly actionId: string;
	readonly value: unknown;
	readonly diagnostics: CompileDiagnostic[];
}): CompiledDomainActionPlan => {
	const actionRecord = asRecord(input.value) ?? {};
	const stepValues = Array.isArray(actionRecord.steps)
		? actionRecord.steps
		: [];
	const steps: CompiledDomainActionStepPlan[] = [];
	for (let stepIndex = 0; stepIndex < stepValues.length; stepIndex += 1) {
		const parsed = parseActionStep({
			actionId: input.actionId,
			stepIndex,
			value: stepValues[stepIndex],
			diagnostics: input.diagnostics,
		});
		if (parsed !== undefined) {
			steps.push(parsed);
		}
	}

	const guardsRecord = asRecord(actionRecord.guards) ?? {};
	const preGuard = asRecord(guardsRecord.pre);
	const postGuard = asRecord(guardsRecord.post);

	const signalGuardValues =
		Array.isArray(actionRecord.signalGuards) &&
		actionRecord.signalGuards.length > 0
			? actionRecord.signalGuards
			: Array.isArray(actionRecord.signal_guards)
				? actionRecord.signal_guards
				: [];
	const signalGuards = signalGuardValues
		.map((value, index) => {
			const binding = asRecord(value);
			const signalId = asString(binding?.signalId);
			const definition = asRecord(binding?.definition);
			if (signalId === undefined || definition === undefined) {
				input.diagnostics.push(
					domainRuntimeIRError(
						`domain.actions.${input.actionId}.signalGuards.${index}`,
						"Signal guard binding requires `signalId` and `definition`.",
					),
				);
				return undefined;
			}
			return {
				signalId,
				definition: definition as unknown as CompiledGuardDefinition,
			};
		})
		.filter((value): value is NonNullable<typeof value> => value !== undefined);

	const flowGuardValues =
		Array.isArray(actionRecord.flowGuards) && actionRecord.flowGuards.length > 0
			? actionRecord.flowGuards
			: Array.isArray(actionRecord.flow_guards)
				? actionRecord.flow_guards
				: [];
	const flowGuards = flowGuardValues
		.map((value, index) => {
			const binding = asRecord(value);
			const flowId = asString(binding?.flowId);
			const definition = asRecord(binding?.definition);
			if (flowId === undefined || definition === undefined) {
				input.diagnostics.push(
					domainRuntimeIRError(
						`domain.actions.${input.actionId}.flowGuards.${index}`,
						"Flow guard binding requires `flowId` and `definition`.",
					),
				);
				return undefined;
			}
			return {
				flowId,
				definition: definition as unknown as CompiledGuardDefinition,
			};
		})
		.filter((value): value is NonNullable<typeof value> => value !== undefined);

	const sessionRecord = asRecord(actionRecord.session) ?? {};
	const onSuccessValue =
		asString(sessionRecord.onSuccess) ?? asString(sessionRecord.on_success);
	const onFailureValue =
		asString(sessionRecord.onFailure) ?? asString(sessionRecord.on_failure);
	const onSuccess =
		onSuccessValue === "clear" || onSuccessValue === "preserve"
			? onSuccessValue
			: "preserve";
	const onFailure =
		onFailureValue === "clear" || onFailureValue === "preserve"
			? onFailureValue
			: "preserve";

	return {
		actionId: input.actionId,
		steps,
		...(preGuard === undefined && postGuard === undefined
			? {}
			: {
					guards: {
						...(preGuard === undefined
							? {}
							: { pre: preGuard as unknown as CompiledGuardDefinition }),
						...(postGuard === undefined
							? {}
							: { post: postGuard as unknown as CompiledGuardDefinition }),
					},
				}),
		...(signalGuards.length === 0 ? {} : { signalGuards }),
		...(flowGuards.length === 0 ? {} : { flowGuards }),
		session: {
			onSuccess,
			onFailure,
		},
	};
};
