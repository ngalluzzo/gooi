import type {
	CanonicalSpecModel,
	CompileDiagnostic,
} from "../compile.contracts";
import { asRecord, asString, referenceNotFound } from "./shared";

const capabilityReferenceKey = (id: string, version: string): string =>
	`${id}@${version}`;

/**
 * Validates `wiring.requirements.capabilities` references to `domain.capabilities`.
 *
 * @param model - Canonical in-memory model.
 * @returns Capability-reference diagnostics.
 */
export const validateCapabilityLinks = (
	model: CanonicalSpecModel,
): readonly CompileDiagnostic[] => {
	const diagnostics: CompileDiagnostic[] = [];
	const knownCapabilityRefs = new Set(model.references.capabilityRefs);
	const wiring = asRecord(model.sections.wiring) ?? {};
	const requirementsRecord = asRecord(wiring.requirements) ?? {};
	const requirements = Array.isArray(requirementsRecord.capabilities)
		? requirementsRecord.capabilities
		: [];

	for (const [index, requirement] of requirements.entries()) {
		const requirementRecord = asRecord(requirement);
		const portId = asString(requirementRecord?.portId);
		const portVersion = asString(requirementRecord?.portVersion);
		if (portId === undefined) {
			continue;
		}
		if (portVersion === undefined) {
			continue;
		}
		const reference = capabilityReferenceKey(portId, portVersion);
		if (knownCapabilityRefs.has(reference)) {
			continue;
		}
		const knownId = model.references.capabilityRefs.some((capabilityRef) =>
			capabilityRef.startsWith(`${portId}@`),
		);
		if (!knownId) {
			diagnostics.push(
				referenceNotFound(
					`wiring.requirements.capabilities.${index}.portId`,
					`Reachability requirement references unknown capability id \`${portId}\`.`,
					"Declare this capability under `domain.capabilities` or update the requirement id.",
				),
			);
			continue;
		}
		diagnostics.push(
			referenceNotFound(
				`wiring.requirements.capabilities.${index}.portVersion`,
				`Reachability requirement version \`${portVersion}\` is not declared for capability id \`${portId}\`.`,
				"Use a declared capability version or update `domain.capabilities`.",
			),
		);
	}

	return diagnostics;
};
