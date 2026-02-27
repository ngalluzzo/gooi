import type { JsonObject } from "@gooi/contract-primitives/json";
import {
	type ProviderManifestBase,
	type ProviderManifestParseResult,
	parseProviderManifestBase,
	safeParseProviderManifestBase,
	semverPattern,
} from "@gooi/provider-manifest/base";
import { z } from "zod";

const capabilityContractHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const semverSchema = z.string().regex(semverPattern, {
	message: "Expected semver in MAJOR.MINOR.PATCH format.",
});
export const executionHostSchema = z.enum([
	"browser",
	"node",
	"edge",
	"worker",
]);

/**
 * Identifier for a capability port and version pair.
 */
export const capabilityPortReferenceSchema = z.object({
	portId: z.string().min(1),
	portVersion: semverSchema,
});

/**
 * A capability reference tuple.
 */
export type CapabilityPortReference = z.infer<
	typeof capabilityPortReferenceSchema
>;

/**
 * Runtime execution host identifier.
 */
export type ExecutionHost = z.infer<typeof executionHostSchema>;

/**
 * Manifest declaration for one provider-fulfilled capability.
 */
export const providerCapabilitySchema = capabilityPortReferenceSchema.extend({
	contractHash: capabilityContractHashSchema,
	executionHosts: z.array(executionHostSchema).min(1),
	delegationAllowedFrom: z.array(executionHostSchema).min(1).optional(),
});

/**
 * Provider capability manifest entry.
 */
export type ProviderCapability = z.infer<typeof providerCapabilitySchema>;

/**
 * Provider manifest contract used by runtime activation.
 */
export interface ProviderManifest extends ProviderManifestBase {
	readonly capabilities: readonly ProviderCapability[];
}

const parseCapabilities = (
	value: unknown,
): ProviderManifestParseResult<readonly ProviderCapability[]> => {
	const parsed = z.array(providerCapabilitySchema).min(1).safeParse(value);
	if (!parsed.success) {
		return {
			success: false,
			error: {
				issues: parsed.error.issues.map((issue) => ({
					path: issue.path.map((part) => String(part)),
					message: issue.message,
				})),
			},
		};
	}
	return {
		success: true,
		data: parsed.data,
	};
};

const isRecord = (value: unknown): value is JsonObject =>
	typeof value === "object" && value !== null;

const getCapabilitiesValue = (value: unknown): unknown =>
	isRecord(value) ? value.capabilities : undefined;

/**
 * Parses and validates a provider manifest.
 */
export const parseProviderManifest = (value: unknown): ProviderManifest => {
	const base = parseProviderManifestBase(value);
	const capabilitiesValue = getCapabilitiesValue(value);
	const capabilities = parseCapabilities(capabilitiesValue);
	if (!capabilities.success) {
		throw new Error(
			`Invalid provider manifest capabilities: ${capabilities.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
		);
	}

	return {
		providerId: base.providerId,
		providerVersion: base.providerVersion,
		hostApiRange: base.hostApiRange,
		capabilities: capabilities.data,
	};
};

/**
 * Safely parses and validates a provider manifest.
 */
export const safeParseProviderManifest = (
	value: unknown,
): ProviderManifestParseResult<ProviderManifest> => {
	const base = safeParseProviderManifestBase(value);
	if (!base.success) {
		return base;
	}

	const capabilitiesValue = getCapabilitiesValue(value);
	const capabilities = parseCapabilities(capabilitiesValue);
	if (!capabilities.success) {
		return capabilities as ProviderManifestParseResult<ProviderManifest>;
	}

	return {
		success: true,
		data: {
			providerId: base.data.providerId,
			providerVersion: base.data.providerVersion,
			hostApiRange: base.data.hostApiRange,
			capabilities: capabilities.data,
		},
	};
};
