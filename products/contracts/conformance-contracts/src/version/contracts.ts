/**
 * Canonical boundary contract API.
 */
import * as version from "./version";

export type { ConformanceContractVersion } from "./version";

export const versionContracts = Object.freeze({
	conformanceContractVersionSchema: version.conformanceContractVersionSchema,
	supportedConformanceContractVersions:
		version.supportedConformanceContractVersions,
	isConformanceContractVersionSupported:
		version.isConformanceContractVersionSupported,
	assertSupportedConformanceContractVersion:
		version.assertSupportedConformanceContractVersion,
});
