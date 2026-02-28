import type { AuthoringDiagnosticsEnvelope } from "@gooi/authoring-contracts/envelopes";
import {
	type AuthoringReachabilityDiagnosticCode,
	reachabilityQuickFixContractRefs,
} from "../../contracts/diagnostics-contracts";
import type { AuthoringReadContext } from "../../contracts/read-context";
import {
	asRecord,
	asString,
	sourceSpecReachabilityModes,
	sourceSpecRouteIds,
} from "../../internal/source-spec";
import { findDiagnosticRangeFromToken } from "./diagnostic-range";

type AuthoringDiagnostic = AuthoringDiagnosticsEnvelope["diagnostics"][number];

const reachabilityModeSet = new Set(sourceSpecReachabilityModes);

const quickFixesForReachability = (
	code: AuthoringReachabilityDiagnosticCode,
): AuthoringDiagnostic["quickFixes"] => {
	switch (code) {
		case "reachability_mode_invalid":
			return [
				{
					id: "set_supported_reachability_mode",
					title: "Use a supported mode",
					contractRef: reachabilityQuickFixContractRefs.resolverInput,
				},
			];
		case "reachability_delegate_route_unknown":
			return [
				{
					id: "set_known_delegate_route_id",
					title: "Use a known route id",
					contractRef: reachabilityQuickFixContractRefs.runtimeResolution,
				},
			];
		default:
			return [
				{
					id: "align_binding_requirements",
					title: "Align requirement with resolver contracts",
					contractRef: reachabilityQuickFixContractRefs.resolverInput,
				},
			];
	}
};

const buildReachabilityDiagnostic = (input: {
	readonly context: AuthoringReadContext;
	readonly code: AuthoringReachabilityDiagnosticCode;
	readonly path: string;
	readonly message: string;
	readonly token?: string;
	readonly hint: string;
}): AuthoringDiagnostic => ({
	code: input.code,
	severity: "error",
	message: input.message,
	path: input.path,
	range: findDiagnosticRangeFromToken(input.context.documentText, input.token),
	hint: input.hint,
	quickFixes: quickFixesForReachability(input.code),
});

/**
 * Collects reachability/delegation diagnostics from optional source spec content.
 */
export const collectReachabilityDiagnostics = (
	context: AuthoringReadContext,
): AuthoringDiagnostic[] => {
	if (context.sourceSpec === undefined) {
		return [];
	}

	const sourceRoot = asRecord(context.sourceSpec);
	const requirements = Array.isArray(
		asRecord(asRecord(sourceRoot?.wiring)?.requirements)?.capabilities,
	)
		? (asRecord(asRecord(sourceRoot?.wiring)?.requirements)
				?.capabilities as readonly unknown[])
		: [];
	const routeIds = new Set(sourceSpecRouteIds(context.sourceSpec));
	const versionByCapabilityId = new Map<string, Set<string>>();
	for (const capability of context.capabilityIndexSnapshot.capabilities) {
		const versions =
			versionByCapabilityId.get(capability.capabilityId) ?? new Set();
		versions.add(capability.capabilityVersion);
		versionByCapabilityId.set(capability.capabilityId, versions);
	}

	const diagnostics: AuthoringDiagnostic[] = [];
	const seenModes = new Map<string, Set<string>>();

	for (let index = 0; index < requirements.length; index += 1) {
		const requirement = asRecord(requirements[index]);
		const pathPrefix = `wiring.requirements.capabilities.${index}`;
		const portId = asString(requirement?.portId);
		const portVersion = asString(requirement?.portVersion);
		const mode = asString(requirement?.mode);
		const delegateRouteId =
			asString(requirement?.delegateRouteId) ??
			asString(requirement?.delegate_route_id);

		if (mode !== undefined && !reachabilityModeSet.has(mode)) {
			diagnostics.push(
				buildReachabilityDiagnostic({
					context,
					code: "reachability_mode_invalid",
					path: `${pathPrefix}.mode`,
					message: `Reachability mode '${mode}' is not supported.`,
					token: mode,
					hint: "Use one of: local, delegated, unreachable.",
				}),
			);
		}

		if (portId !== undefined) {
			const versions = versionByCapabilityId.get(portId);
			if (versions === undefined) {
				diagnostics.push(
					buildReachabilityDiagnostic({
						context,
						code: "reachability_capability_unknown",
						path: `${pathPrefix}.portId`,
						message: `Reachability requirement references unknown capability '${portId}'.`,
						token: portId,
						hint: "Reference a capability declared in the capability index snapshot.",
					}),
				);
			} else if (portVersion !== undefined && !versions.has(portVersion)) {
				diagnostics.push(
					buildReachabilityDiagnostic({
						context,
						code: "reachability_capability_version_unknown",
						path: `${pathPrefix}.portVersion`,
						message: `Capability '${portId}' does not include version '${portVersion}'.`,
						token: portVersion,
						hint: "Use a capability version available in the snapshot metadata.",
					}),
				);
			}

			if (portVersion !== undefined && mode !== undefined) {
				const key = `${portId}@${portVersion}`;
				const modes = seenModes.get(key) ?? new Set<string>();
				modes.add(mode);
				seenModes.set(key, modes);
			}
		}

		if (mode === "delegated" && delegateRouteId !== undefined) {
			if (!routeIds.has(delegateRouteId)) {
				diagnostics.push(
					buildReachabilityDiagnostic({
						context,
						code: "reachability_delegate_route_unknown",
						path: `${pathPrefix}.delegateRouteId`,
						message: `Delegated reachability references unknown route '${delegateRouteId}'.`,
						token: delegateRouteId,
						hint: "Use a declared route id for delegated execution routing.",
					}),
				);
			}
		}
	}

	for (const [capabilityRef, modes] of seenModes.entries()) {
		if (modes.size <= 1) {
			continue;
		}
		diagnostics.push(
			buildReachabilityDiagnostic({
				context,
				code: "reachability_requirement_ambiguous",
				path: "wiring.requirements.capabilities",
				message: `Reachability requirement '${capabilityRef}' declares conflicting modes.`,
				token: capabilityRef,
				hint: "Keep one deterministic mode per capability id and version.",
			}),
		);
	}

	return diagnostics;
};
