import type { AuthoringDiagnosticsEnvelope } from "@gooi/authoring-contracts/envelopes";
import type { AuthoringGuardScenarioDiagnosticCode } from "../../contracts/diagnostics-contracts";
import type { AuthoringReadContext } from "../../contracts/read-context";
import {
	sourceSpecCaptureSources,
	sourceSpecGuardPolicies,
} from "../../internal/source-spec";
import { findDiagnosticRangeFromToken } from "./diagnostic-range";

type AuthoringDiagnostic = AuthoringDiagnosticsEnvelope["diagnostics"][number];

export const guardPolicySet = new Set(sourceSpecGuardPolicies);
export const captureSourceSet = new Set(sourceSpecCaptureSources);

const quickFixContractRef = (
	code: AuthoringGuardScenarioDiagnosticCode,
): string =>
	code.startsWith("guard_") || code === "invariant_policy_invalid"
		? "@gooi/guard-contracts/plans/CompiledGuardDefinition"
		: "@gooi/scenario-contracts/plans/CompiledScenarioPlanSet";

export const buildGuardScenarioDiagnostic = (input: {
	readonly context: AuthoringReadContext;
	readonly code: AuthoringGuardScenarioDiagnosticCode;
	readonly path: string;
	readonly message: string;
	readonly hint: string;
	readonly token?: string;
}): AuthoringDiagnostic => ({
	code: input.code,
	severity: "error",
	message: input.message,
	path: input.path,
	range: findDiagnosticRangeFromToken(input.context.documentText, input.token),
	hint: input.hint,
	quickFixes: [
		{
			id: "align_contract_reference",
			title: "Align with contract requirements",
			contractRef: quickFixContractRef(input.code),
		},
	],
});

export type { AuthoringDiagnostic };
