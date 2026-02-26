import type { AuthoringEntrypointSpec } from "../authoring-spec/authoring-spec";
import type {
	CompileDiagnostic,
	CompiledReachabilityRequirement,
} from "./compile.contracts";

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
	const knownCapabilityVersionsById = new Map<string, Set<string>>();
	for (const capability of spec.capabilities ?? []) {
		const versions =
			knownCapabilityVersionsById.get(capability.id) ?? new Set();
		versions.add(capability.version);
		knownCapabilityVersionsById.set(capability.id, versions);
	}

	for (const [index, requirement] of declared.entries()) {
		const key = requirementKey(requirement.portId, requirement.portVersion);
		const knownVersions = knownCapabilityVersionsById.get(requirement.portId);
		if (knownVersions === undefined) {
			diagnostics.push({
				severity: "error",
				code: "reachability_requirement_capability_id_not_found",
				path: `wiring.requirements.capabilities.${index}.portId`,
				message: `Reachability requirement references unknown capability id \`${requirement.portId}\`.`,
				hint: "Declare the capability id in `capabilities` before referencing it in wiring requirements.",
			});
		} else if (!knownVersions.has(requirement.portVersion)) {
			diagnostics.push({
				severity: "error",
				code: "reachability_requirement_capability_version_not_found",
				path: `wiring.requirements.capabilities.${index}.portVersion`,
				message: `Reachability requirement version \`${requirement.portVersion}\` is not declared for capability id \`${requirement.portId}\`.`,
				hint: "Use a declared capability version or add the version to `capabilities`.",
			});
		}
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
