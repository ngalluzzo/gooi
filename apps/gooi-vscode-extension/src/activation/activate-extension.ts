import { createLanguageClient } from "../client/create-language-client";
import {
	type AuthoringCommandCallbacks,
	registerAuthoringCommands,
} from "../commands/register-authoring-commands";
import { loadAuthoringContext } from "../context/load-authoring-context";
import {
	type GooiExtensionSettings,
	parseExtensionSettings,
} from "../contracts/extension-settings";
import type {
	GooiExtensionHost,
	HostDisposable,
} from "../contracts/host-ports";
import {
	type AuthoringExtensionService,
	createAuthoringExtensionService,
} from "../service/create-authoring-extension-service";

/**
 * Activation handle returned to host adapters.
 */
export interface ActivatedGooiExtension {
	/** Parsed runtime settings. */
	settings: GooiExtensionSettings;
	/** Service facade used by registered editor providers. */
	service: AuthoringExtensionService;
	/** Disposes all host registrations and diagnostics collections. */
	dispose: () => void;
}

const getSettings = (host: GooiExtensionHost): GooiExtensionSettings =>
	parseExtensionSettings(host.getConfigurationSection("gooi.authoring"));

/**
 * Activates the Gooi authoring extension against a host adapter.
 *
 * @param input - Host adapter and optional runtime callbacks.
 * @returns Activation handle with disposal lifecycle.
 *
 * @example
 * const activation = activateExtension({ host });
 */
export const activateExtension = (input: {
	host: GooiExtensionHost;
	commandCallbacks?: AuthoringCommandCallbacks;
}): ActivatedGooiExtension => {
	const settings = getSettings(input.host);
	const workspaceRoot = input.host.getWorkspaceRootPath();
	if (workspaceRoot === undefined) {
		void input.host.showErrorMessage("Gooi extension requires a workspace.");
		throw new Error(
			"Workspace root is required for Gooi extension activation.",
		);
	}

	let context: ReturnType<typeof loadAuthoringContext>;
	try {
		context = loadAuthoringContext({
			workspaceRoot,
			contextPath: settings.contextPath,
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Unknown authoring context error.";
		void input.host.showErrorMessage(
			`Gooi extension failed to load authoring context: ${message}`,
		);
		throw error;
	}

	const client = createLanguageClient({ context, initialVersion: 0 });
	const service = createAuthoringExtensionService({ client });
	const diagnosticsCollection = input.host.createDiagnosticsCollection("gooi");
	const disposables: HostDisposable[] = [];

	const refreshDiagnostics = (): void => {
		const result = service.pullEditorDiagnostics();
		diagnosticsCollection.set(result.documentUri, result.diagnostics);
	};

	disposables.push(
		input.host.onDidOpenDocument(async (document) => {
			service.didOpen(document);
			if (settings.diagnosticsMode === "push") {
				refreshDiagnostics();
			}
		}),
	);
	disposables.push(
		input.host.onDidChangeDocument(async (document) => {
			service.didChange(document);
			if (settings.diagnosticsMode === "push") {
				refreshDiagnostics();
			}
		}),
	);

	disposables.push(
		input.host.registerCompletionProvider(
			async ({ position }) => service.completion(position),
			[".", ":"],
		),
	);
	disposables.push(
		input.host.registerCompletionResolveProvider(
			async (item) => service.resolveCompletion(item).item,
		),
	);
	disposables.push(
		input.host.registerHoverProvider(
			async ({ position }) => service.hover(position).hover,
		),
	);
	disposables.push(
		input.host.registerDefinitionProvider(
			async ({ position }) => service.definition(position).location,
		),
	);
	disposables.push(
		input.host.registerReferencesProvider(
			async ({ position, includeDeclaration }) =>
				service.references(position, includeDeclaration).items,
		),
	);
	disposables.push(
		input.host.registerDocumentSymbolProvider(
			async () => service.documentSymbols().items,
		),
	);
	disposables.push(
		input.host.registerWorkspaceSymbolProvider(
			async (query) => service.workspaceSymbols(query).items,
		),
	);
	disposables.push(
		input.host.registerCodeLensProvider({
			provide: async () =>
				settings.enableCodeLens ? service.codeLenses().lenses : [],
			resolve: async (lens) => service.resolveCodeLens(lens).lens,
		}),
	);
	disposables.push(
		input.host.registerRenameProvider({
			prepare: async ({ position }) => service.prepareRename(position),
			rename: async ({ position, newName }) =>
				service.rename(position, newName),
		}),
	);
	disposables.push(
		...registerAuthoringCommands(
			input.commandCallbacks === undefined
				? { host: input.host }
				: { host: input.host, callbacks: input.commandCallbacks },
		),
	);

	if (settings.diagnosticsMode === "push") {
		refreshDiagnostics();
	}

	return {
		settings,
		service,
		dispose: () => {
			diagnosticsCollection.clear();
			diagnosticsCollection.dispose();
			for (const disposable of disposables) {
				disposable.dispose();
			}
		},
	};
};
