import type { ProviderModule } from "../../src/engine";
import { createHostPorts } from "../fixtures/provider-runtime.fixture";

export const createMissingHostPortCase = (
	providerModule: ProviderModule,
	path:
		| "clock.nowIso"
		| "activationPolicy.assertHostVersionAligned"
		| "capabilityDelegation.invokeDelegated"
		| "moduleLoader.loadModule"
		| "moduleIntegrity.assertModuleIntegrity",
) => {
	const base = createHostPorts(providerModule);
	switch (path) {
		case "clock.nowIso":
			return {
				...base,
				clock: {},
			};
		case "activationPolicy.assertHostVersionAligned":
			return {
				...base,
				activationPolicy: {},
			};
		case "capabilityDelegation.invokeDelegated":
			return {
				...base,
				capabilityDelegation: {},
			};
		case "moduleLoader.loadModule":
			return {
				...base,
				moduleLoader: {},
			};
		case "moduleIntegrity.assertModuleIntegrity":
			return {
				...base,
				moduleIntegrity: {},
			};
	}
};
