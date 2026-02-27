import {
	type ProviderManifestBase,
	safeParseProviderManifestBase,
	semverPattern,
} from "@gooi/marketplace-contracts/provider-manifest/base";

/**
 * Stable contract descriptor for one host port feature.
 */
export interface HostPortContractDescriptor {
	readonly id: string;
	readonly version: string;
}

interface HostProviderConstructionIssue {
	readonly path: string;
	readonly message: string;
}

const issueMessage = (
	prefix: string,
	issues: readonly HostProviderConstructionIssue[],
): string =>
	`${prefix}: ${issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const validateContractDescriptor = (
	descriptor: unknown,
): readonly HostProviderConstructionIssue[] => {
	if (!isRecord(descriptor)) {
		return [{ path: "contract", message: "Expected object." }];
	}

	const { id, version } = descriptor;
	const issues: HostProviderConstructionIssue[] = [];
	if (typeof id !== "string" || id.length === 0) {
		issues.push({
			path: "contract.id",
			message: "Expected non-empty string.",
		});
	}
	if (typeof version !== "string" || !semverPattern.test(version)) {
		issues.push({
			path: "contract.version",
			message: "Expected semver in MAJOR.MINOR.PATCH format.",
		});
	}
	return issues;
};

const normalizeHostPortProviderManifest = <
	TContract extends HostPortContractDescriptor,
>(
	manifest: HostPortProviderManifest<TContract>,
): HostPortProviderManifest<TContract> => {
	const manifestResult = safeParseProviderManifestBase(manifest);
	if (!manifestResult.success) {
		throw new Error(
			issueMessage(
				"Invalid host provider manifest",
				manifestResult.error.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
				})),
			),
		);
	}

	const contractIssues = validateContractDescriptor(manifest.contract);
	if (contractIssues.length > 0) {
		throw new Error(
			issueMessage("Invalid host provider contract descriptor", contractIssues),
		);
	}

	return {
		providerId: manifestResult.data.providerId,
		providerVersion: manifestResult.data.providerVersion,
		hostApiRange: manifestResult.data.hostApiRange,
		contract: manifest.contract,
	};
};

/**
 * Shared host provider manifest type.
 */
export type HostPortProviderManifest<
	TContract extends HostPortContractDescriptor = HostPortContractDescriptor,
> = ProviderManifestBase & {
	readonly contract: TContract;
};

/**
 * Input payload for host provider manifest construction.
 */
export interface CreateHostPortProviderManifestInput<
	TContract extends HostPortContractDescriptor = HostPortContractDescriptor,
> {
	readonly manifest: ProviderManifestBase;
	readonly contract: TContract;
}

/**
 * Creates a host provider manifest with stable contract metadata.
 */
export const createHostPortProviderManifest = <
	TContract extends HostPortContractDescriptor,
>(
	input: CreateHostPortProviderManifestInput<TContract>,
): HostPortProviderManifest<TContract> =>
	normalizeHostPortProviderManifest({
		providerId: input.manifest.providerId,
		providerVersion: input.manifest.providerVersion,
		hostApiRange: input.manifest.hostApiRange,
		contract: input.contract,
	});

/**
 * Shared provider definition shape for host port implementations.
 */
export interface HostPortProvider<
	TCreatePort,
	TContract extends HostPortContractDescriptor = HostPortContractDescriptor,
> {
	readonly manifest: HostPortProviderManifest<TContract>;
	readonly createPort: TCreatePort;
}

/**
 * Input payload for host port provider construction.
 */
export interface CreateHostPortProviderInput<
	TCreatePort,
	TContract extends HostPortContractDescriptor = HostPortContractDescriptor,
> {
	readonly manifest: HostPortProviderManifest<TContract>;
	readonly createPort: TCreatePort;
}

/**
 * Creates a host provider definition.
 */
export const createHostPortProvider = <
	TCreatePort,
	TContract extends HostPortContractDescriptor = HostPortContractDescriptor,
>(
	input: CreateHostPortProviderInput<TCreatePort, TContract>,
): HostPortProvider<TCreatePort, TContract> => {
	if (typeof input.createPort !== "function") {
		throw new Error(
			"Invalid host provider createPort: expected function createPort factory.",
		);
	}
	return {
		manifest: normalizeHostPortProviderManifest(input.manifest),
		createPort: input.createPort,
	};
};
