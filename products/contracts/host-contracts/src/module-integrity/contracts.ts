/**
 * Canonical boundary contract API.
 */
import * as module_integrity from "./module-integrity";

export type {
	AssertModuleIntegrityInput,
	CreateHostModuleIntegrityProviderInput,
	HostModuleIntegrityPort,
	HostModuleIntegrityProvider,
	HostModuleIntegrityProviderManifest,
} from "./module-integrity";

export const moduleIntegrityContracts = Object.freeze({
	createHostModuleIntegrityProvider:
		module_integrity.createHostModuleIntegrityProvider,
	createPermissiveModuleIntegrityPort:
		module_integrity.createPermissiveModuleIntegrityPort,
	createFailingModuleIntegrityPort:
		module_integrity.createFailingModuleIntegrityPort,
});
