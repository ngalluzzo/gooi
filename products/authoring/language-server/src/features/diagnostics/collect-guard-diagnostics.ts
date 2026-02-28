import type { AuthoringReadContext } from "../../contracts/read-context";
import {
	asRecord,
	asString,
	sourceSpecFlowIds,
	sourceSpecSignalIds,
} from "../../internal/source-spec";
import {
	type AuthoringDiagnostic,
	buildGuardScenarioDiagnostic,
	guardPolicySet,
} from "./guard-scenario-diagnostic-shared";

/**
 * Collects guard and invariant diagnostics from optional source spec content.
 */
export const collectGuardDiagnostics = (
	context: AuthoringReadContext,
): AuthoringDiagnostic[] => {
	if (context.sourceSpec === undefined) {
		return [];
	}

	const diagnostics: AuthoringDiagnostic[] = [];
	const signals = new Set(sourceSpecSignalIds(context.sourceSpec));
	const flows = new Set(sourceSpecFlowIds(context.sourceSpec));
	const actions =
		asRecord(asRecord(asRecord(context.sourceSpec)?.domain)?.actions) ?? {};

	for (const [actionId, actionValue] of Object.entries(actions).sort(
		([left], [right]) => left.localeCompare(right),
	)) {
		const action = asRecord(actionValue) ?? {};
		const validatePolicy = (input: {
			readonly policyValue: unknown;
			readonly path: string;
			readonly code: "guard_policy_invalid" | "invariant_policy_invalid";
		}) => {
			const policy = asString(input.policyValue);
			if (policy !== undefined && !guardPolicySet.has(policy)) {
				diagnostics.push(
					buildGuardScenarioDiagnostic({
						context,
						code: input.code,
						path: input.path,
						message: `Guard policy '${policy}' is not supported.`,
						token: policy,
						hint: "Use abort, fail_action, log_and_continue, or emit_violation.",
					}),
				);
			}
		};

		const guards = asRecord(action.guards) ?? {};
		validatePolicy({
			policyValue: asRecord(guards.pre)?.onFail,
			path: `domain.actions.${actionId}.guards.pre.onFail`,
			code: "guard_policy_invalid",
		});
		validatePolicy({
			policyValue: asRecord(guards.post)?.onFail,
			path: `domain.actions.${actionId}.guards.post.onFail`,
			code: "guard_policy_invalid",
		});

		const signalGuards = Array.isArray(action.signalGuards)
			? action.signalGuards
			: Array.isArray(action.signal_guards)
				? action.signal_guards
				: [];
		for (let index = 0; index < signalGuards.length; index += 1) {
			const binding = asRecord(signalGuards[index]) ?? {};
			const signalId = asString(binding.signalId);
			if (signalId !== undefined && !signals.has(signalId)) {
				diagnostics.push(
					buildGuardScenarioDiagnostic({
						context,
						code: "guard_signal_unknown",
						path: `domain.actions.${actionId}.signalGuards.${index}.signalId`,
						message: `Signal guard references unknown signal '${signalId}'.`,
						token: signalId,
						hint: "Reference a declared domain signal id.",
					}),
				);
			}
			validatePolicy({
				policyValue: asRecord(binding.definition)?.onFail,
				path: `domain.actions.${actionId}.signalGuards.${index}.definition.onFail`,
				code: "guard_policy_invalid",
			});
		}

		const flowGuards = Array.isArray(action.flowGuards)
			? action.flowGuards
			: Array.isArray(action.flow_guards)
				? action.flow_guards
				: [];
		for (let index = 0; index < flowGuards.length; index += 1) {
			const binding = asRecord(flowGuards[index]) ?? {};
			const flowId = asString(binding.flowId);
			if (flowId !== undefined && !flows.has(flowId)) {
				diagnostics.push(
					buildGuardScenarioDiagnostic({
						context,
						code: "guard_flow_unknown",
						path: `domain.actions.${actionId}.flowGuards.${index}.flowId`,
						message: `Flow guard references unknown flow '${flowId}'.`,
						token: flowId,
						hint: "Reference a declared domain flow id.",
					}),
				);
			}
			validatePolicy({
				policyValue: asRecord(binding.definition)?.onFail,
				path: `domain.actions.${actionId}.flowGuards.${index}.definition.onFail`,
				code: "guard_policy_invalid",
			});
		}

		const steps = Array.isArray(action.steps) ? action.steps : [];
		for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
			const step = asRecord(steps[stepIndex]) ?? {};
			const invariants = Array.isArray(step.invariants) ? step.invariants : [];
			for (
				let invariantIndex = 0;
				invariantIndex < invariants.length;
				invariantIndex += 1
			) {
				const invariant = asRecord(invariants[invariantIndex]) ?? {};
				const onFail = asString(invariant.onFail);
				if (onFail === "fail_action") {
					diagnostics.push(
						buildGuardScenarioDiagnostic({
							context,
							code: "invariant_policy_invalid",
							path: `domain.actions.${actionId}.steps.${stepIndex}.invariants.${invariantIndex}.onFail`,
							message:
								"Invariant policy 'fail_action' is not supported for invariant definitions.",
							token: onFail,
							hint: "Use abort, log_and_continue, or emit_violation for invariants.",
						}),
					);
				}
			}
		}
	}

	return diagnostics;
};
