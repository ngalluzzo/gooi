import { areBindingArtifactsAligned } from "@gooi/binding/artifact-alignment/policy";
import type { BindingPlan } from "@gooi/binding/binding-plan/contracts";
import { getCapabilityBinding } from "@gooi/binding/binding-plan/lookup";
import type { DeploymentLockfile } from "@gooi/binding/lockfile/contracts";
import { isLockedProviderIntegrity } from "@gooi/binding/lockfile/integrity";
import { getLockedProvider } from "@gooi/binding/lockfile/lookup";
import type { CapabilityPortContract } from "@gooi/capability-contracts/capability-port";
import { hostProviderSchemaProfile } from "@gooi/capability-contracts/capability-port";
import {
	type ProviderManifest,
	safeParseProviderManifest,
} from "@gooi/capability-contracts/provider-manifest";
import { fail, ok } from "../shared/result";
import type { RuntimeResult } from "../shared/types";

export const validateContractSchemaProfiles = (
	contracts: readonly CapabilityPortContract[],
): RuntimeResult<void> => {
	for (const contract of contracts) {
		for (const boundary of ["input", "output", "error"] as const) {
			const target = contract.artifacts[boundary].target;
			if (target !== hostProviderSchemaProfile) {
				return fail(
					"compatibility_error",
					"Capability contract schema profile is incompatible with host/provider profile.",
					{
						code: "schema_profile_mismatch",
						portId: contract.id,
						portVersion: contract.version,
						boundary,
						expectedSchemaProfile: hostProviderSchemaProfile,
						actualSchemaProfile: target,
					},
				);
			}
		}
	}

	return ok(undefined);
};

export const validateBindingRequirements = (
	manifest: ProviderManifest,
	contracts: readonly CapabilityPortContract[],
	bindingPlan: BindingPlan,
	lockfile: DeploymentLockfile,
): RuntimeResult<void> => {
	if (!areBindingArtifactsAligned(bindingPlan, lockfile)) {
		return fail(
			"activation_error",
			"Binding plan and lockfile are not aligned for app/environment/host API.",
		);
	}

	const lockEntry = getLockedProvider(
		lockfile,
		manifest.providerId,
		manifest.providerVersion,
	);

	if (lockEntry === null) {
		return fail("activation_error", "Provider version not found in lockfile.", {
			providerId: manifest.providerId,
			providerVersion: manifest.providerVersion,
		});
	}

	if (!isLockedProviderIntegrity(lockEntry.integrity)) {
		return fail(
			"activation_error",
			"Lockfile provider integrity is invalid; expected sha256 checksum format.",
			{
				providerId: manifest.providerId,
				providerVersion: manifest.providerVersion,
				integrity: lockEntry.integrity,
			},
		);
	}

	for (const contract of contracts) {
		const binding = getCapabilityBinding(
			bindingPlan,
			contract.id,
			contract.version,
		);

		if (binding === null) {
			return fail("activation_error", "Missing capability binding in plan.", {
				portId: contract.id,
				portVersion: contract.version,
			});
		}

		if (binding.resolution.mode === "unreachable") {
			return fail(
				"capability_unreachable_error",
				"Capability is unreachable in binding plan.",
				{
					portId: contract.id,
					portVersion: contract.version,
					resolutionMode: binding.resolution.mode,
				},
			);
		}

		if (binding.resolution.providerId !== manifest.providerId) {
			return fail(
				"activation_error",
				"Capability is bound to a different provider in binding plan.",
				{
					portId: contract.id,
					portVersion: contract.version,
					expectedProviderId: binding.resolution.providerId,
					actualProviderId: manifest.providerId,
				},
			);
		}

		const manifestCapability = manifest.capabilities.find(
			(capability) =>
				capability.portId === contract.id &&
				capability.portVersion === contract.version &&
				capability.contractHash === contract.artifacts.contractHash,
		);

		if (manifestCapability === undefined) {
			return fail(
				"activation_error",
				"Provider manifest missing required capability or contract hash mismatch.",
				{
					portId: contract.id,
					portVersion: contract.version,
				},
			);
		}

		if (
			!manifestCapability.executionHosts.includes(binding.resolution.targetHost)
		) {
			return fail(
				"activation_error",
				"Provider manifest capability execution hosts do not satisfy binding resolution target host.",
				{
					portId: contract.id,
					portVersion: contract.version,
					targetHost: binding.resolution.targetHost,
				},
			);
		}

		const lockedCapability = lockEntry.capabilities.find(
			(capability) =>
				capability.portId === contract.id &&
				capability.portVersion === contract.version &&
				capability.contractHash === contract.artifacts.contractHash,
		);

		if (lockedCapability === undefined) {
			return fail(
				"activation_error",
				"Lockfile missing required capability hash for provider.",
				{
					portId: contract.id,
					portVersion: contract.version,
				},
			);
		}
	}

	return ok(undefined);
};

export const providerManifestSafeParse = (
	manifest: unknown,
): RuntimeResult<ProviderManifest> => {
	const parsed = safeParseProviderManifest(manifest);
	if (!parsed.success) {
		return fail("validation_error", "Invalid provider manifest.", {
			issues: parsed.error.issues,
		});
	}
	return ok(parsed.data);
};
