/**
 * Canonical boundary contract API.
 */
import * as module_loader from "./module-loader";

export type {
	CreateHostModuleLoaderProviderInput,
	HostModuleLoaderPort,
	HostModuleLoaderProvider,
	HostModuleLoaderProviderManifest,
} from "./module-loader";

export const moduleLoaderContracts = Object.freeze({
	createHostModuleLoaderProvider: module_loader.createHostModuleLoaderProvider,
	createDynamicImportModuleLoaderPort:
		module_loader.createDynamicImportModuleLoaderPort,
	createFailingModuleLoaderPort: module_loader.createFailingModuleLoaderPort,
});
