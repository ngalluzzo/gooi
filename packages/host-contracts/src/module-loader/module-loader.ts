import {
	createHostPortProvider,
	createHostPortProviderManifest,
	type HostPortContractDescriptor,
	type HostPortProvider,
	type HostPortProviderManifest,
} from "../provider/provider";

/**
 * Host module loading contract.
 */
export interface HostModuleLoaderPort<TModule = unknown> {
	/** Loads a runtime module by specifier. */
	readonly loadModule: (specifier: string) => Promise<TModule>;
}

/**
 * Stable module-loader host contract descriptor for provider manifests.
 */
const hostModuleLoaderContract = {
	id: "gooi.host.module-loader",
	version: "1.0.0",
} as const satisfies HostPortContractDescriptor;

/**
 * Provider manifest for module-loader implementations.
 */
export type HostModuleLoaderProviderManifest = HostPortProviderManifest<
	typeof hostModuleLoaderContract
>;

/**
 * Module-loader provider contract consumed by marketplace contributors.
 */
export type HostModuleLoaderProvider<TModule = unknown> = HostPortProvider<
	() => HostModuleLoaderPort<TModule>,
	typeof hostModuleLoaderContract
>;

/**
 * Input payload for module-loader provider construction.
 */
export interface CreateHostModuleLoaderProviderInput<TModule = unknown> {
	readonly manifest: {
		readonly providerId: string;
		readonly providerVersion: string;
		readonly hostApiRange: string;
	};
	readonly createPort: () => HostModuleLoaderPort<TModule>;
}

/**
 * Creates a module-loader provider definition.
 */
export const createHostModuleLoaderProvider = <TModule = unknown>(
	input: CreateHostModuleLoaderProviderInput<TModule>,
): HostModuleLoaderProvider<TModule> =>
	createHostPortProvider({
		manifest: createHostPortProviderManifest({
			manifest: input.manifest,
			contract: hostModuleLoaderContract,
		}),
		createPort: input.createPort,
	});

/**
 * Creates a module loader backed by native dynamic import.
 */
export const createDynamicImportModuleLoaderPort = <
	TModule = unknown,
>(): HostModuleLoaderPort<TModule> => ({
	loadModule: async (specifier: string) => (await import(specifier)) as TModule,
});
