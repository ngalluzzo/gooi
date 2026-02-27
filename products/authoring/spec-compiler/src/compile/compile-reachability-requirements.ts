import type {
	CompileDiagnostic,
	CompiledReachabilityRequirement,
} from "@gooi/app-spec-contracts/compiled";
import type { AuthoringEntrypointSpec } from "@gooi/app-spec-contracts/spec";

interface CompileReachabilityRequirementsOutput {
	readonly requirements: Readonly<
		Record<string, CompiledReachabilityRequirement>
	>;
	readonly diagnostics: readonly CompileDiagnostic[];
}

const requirementKey = (portId: string, portVersion: string): string =>
	`${portId}@${portVersion}`;

/**
 * Compiles wiring reachability requirements into canonical deployment input
 * contracts consumed by resolver/runtime binding artifacts.
 *
 * @param spec - Parsed authoring spec.
 * @returns Canonical reachability requirements and diagnostics.
 */
export const compileReachabilityRequirements = (
	spec: AuthoringEntrypointSpec,
): CompileReachabilityRequirementsOutput => {
	const diagnostics: CompileDiagnostic[] = [];
	const requirements: Record<string, CompiledReachabilityRequirement> = {};
	const declared = spec.wiring.requirements?.capabilities ?? [];

	for (const [index, requirement] of declared.entries()) {
		const key = requirementKey(requirement.portId, requirement.portVersion);
		const existing = requirements[key];
		if (existing === undefined) {
			requirements[key] = {
				portId: requirement.portId,
				portVersion: requirement.portVersion,
				mode: requirement.mode,
			};
			continue;
		}

		if (existing.mode !== requirement.mode) {
			diagnostics.push({
				severity: "error",
				code: "reachability_requirement_ambiguous",
				path: `wiring.requirements.capabilities.${index}`,
				message: `Reachability requirement for \`${key}\` conflicts with previously declared mode \`${existing.mode}\`.`,
			});
		}
	}

	return {
		requirements: Object.fromEntries(
			Object.entries(requirements).sort(([left], [right]) =>
				left.localeCompare(right),
			),
		),
		diagnostics,
	};
};
