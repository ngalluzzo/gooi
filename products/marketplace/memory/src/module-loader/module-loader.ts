import {
	type HostModuleLoaderPort,
	moduleLoaderContracts,
} from "@gooi/host-contracts/module-loader";

/**
 * Input payload for in-memory module-loader configuration.
 */
export interface CreateMemoryModuleLoaderPortInput<TModule = unknown> {
	/** In-memory registry of known module specifiers. */
	readonly modules?: Readonly<Record<string, TModule>>;
	/** Optional fallback loader for unknown module specifiers. */
	readonly fallback?: (specifier: string) => Promise<TModule>;
}

/**
 * Creates an in-memory module-loader port.
 */
export const createMemoryModuleLoaderPort = <TModule = unknown>(
	input?: CreateMemoryModuleLoaderPortInput<TModule>,
): HostModuleLoaderPort<TModule> => {
	const modules = new Map(Object.entries(input?.modules ?? {}));
	return {
		loadModule: async (specifier: string) => {
			if (modules.has(specifier)) {
				return modules.get(specifier) as TModule;
			}
			if (input?.fallback) {
				return await input.fallback(specifier);
			}
			throw new Error(`Unknown module specifier: ${specifier}`);
		},
	};
};

/**
 * Reference module-loader provider for marketplace contributor implementations.
 */
export const memoryModuleLoaderProvider =
	moduleLoaderContracts.createHostModuleLoaderProvider({
		manifest: {
			providerId: "gooi.marketplace.memory",
			providerVersion: "1.0.0",
			hostApiRange: "^1.0.0",
		},
		createPort: createMemoryModuleLoaderPort,
	});
