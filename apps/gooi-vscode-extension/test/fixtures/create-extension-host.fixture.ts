import type {
	EditorDiagnostic,
	EditorDocument,
	EditorPosition,
	GooiExtensionHost,
	HostDisposable,
} from "../../src/contracts/host-ports";

// LOC-EXCEPTION: Consolidated in-memory host fixture keeps extension flow tests readable.
type CompletionHandler = (input: {
	document: EditorDocument;
	position: EditorPosition;
}) => Promise<unknown>;

/**
 * In-memory host fixture used by extension tests.
 */
export interface ExtensionHostFixture {
	host: GooiExtensionHost;
	messages: { info: string[]; warning: string[]; error: string[] };
	diagnostics: Map<string, readonly EditorDiagnostic[]>;
	emitDidOpen: (document: EditorDocument) => Promise<void>;
	emitDidChange: (document: EditorDocument) => Promise<void>;
	callCompletion: (input: {
		document: EditorDocument;
		position: EditorPosition;
	}) => Promise<unknown>;
	callCompletionResolve: (item: unknown) => Promise<unknown>;
	callHover: (input: {
		document: EditorDocument;
		position: EditorPosition;
	}) => Promise<unknown>;
	callDefinition: (input: {
		document: EditorDocument;
		position: EditorPosition;
	}) => Promise<unknown>;
	callReferences: (input: {
		document: EditorDocument;
		position: EditorPosition;
		includeDeclaration: boolean;
	}) => Promise<unknown>;
	callDocumentSymbols: (document: EditorDocument) => Promise<unknown>;
	callWorkspaceSymbols: (query: string) => Promise<unknown>;
	callCodeLensProvide: (document: EditorDocument) => Promise<unknown>;
	callCodeLensResolve: (lens: unknown) => Promise<unknown>;
	callRenamePrepare: (input: {
		document: EditorDocument;
		position: EditorPosition;
	}) => Promise<unknown>;
	callRename: (input: {
		document: EditorDocument;
		position: EditorPosition;
		newName: string;
	}) => Promise<unknown>;
	runCommand: (id: string, ...args: unknown[]) => Promise<void>;
}

/**
 * Creates an in-memory host fixture for extension activation tests.
 */
export const createExtensionHostFixture = (input: {
	workspaceRoot: string;
	settings?: Record<string, unknown>;
}): ExtensionHostFixture => {
	const messages = {
		info: [] as string[],
		warning: [] as string[],
		error: [] as string[],
	};
	const diagnostics = new Map<string, readonly EditorDiagnostic[]>();
	const commandHandlers = new Map<
		string,
		(...args: unknown[]) => void | Promise<void>
	>();
	let onDidOpen:
		| ((document: EditorDocument) => void | Promise<void>)
		| undefined;
	let onDidChange:
		| ((document: EditorDocument) => void | Promise<void>)
		| undefined;
	let completion: CompletionHandler | undefined;
	let completionResolve: ((item: unknown) => Promise<unknown>) | undefined;
	let hover:
		| ((input: {
				document: EditorDocument;
				position: EditorPosition;
		  }) => Promise<unknown>)
		| undefined;
	let definition:
		| ((input: {
				document: EditorDocument;
				position: EditorPosition;
		  }) => Promise<unknown>)
		| undefined;
	let references:
		| ((input: {
				document: EditorDocument;
				position: EditorPosition;
				includeDeclaration: boolean;
		  }) => Promise<unknown>)
		| undefined;
	let documentSymbols:
		| ((document: EditorDocument) => Promise<unknown>)
		| undefined;
	let workspaceSymbols: ((query: string) => Promise<unknown>) | undefined;
	let codeLensProvide:
		| ((document: EditorDocument) => Promise<unknown>)
		| undefined;
	let codeLensResolve: ((lens: unknown) => Promise<unknown>) | undefined;
	let renamePrepare:
		| ((input: {
				document: EditorDocument;
				position: EditorPosition;
		  }) => Promise<unknown>)
		| undefined;
	let renameApply:
		| ((input: {
				document: EditorDocument;
				position: EditorPosition;
				newName: string;
		  }) => Promise<unknown>)
		| undefined;

	const disposable = (onDispose?: () => void): HostDisposable => ({
		dispose: () => onDispose?.(),
	});

	const host: GooiExtensionHost = {
		getConfigurationSection: () => ({ ...input.settings }),
		getWorkspaceRootPath: () => input.workspaceRoot,
		onDidOpenDocument: (handler) => {
			onDidOpen = handler;
			return disposable(() => {
				onDidOpen = undefined;
			});
		},
		onDidChangeDocument: (handler) => {
			onDidChange = handler;
			return disposable(() => {
				onDidChange = undefined;
			});
		},
		registerCompletionProvider: (handler) => {
			completion = handler;
			return disposable(() => {
				completion = undefined;
			});
		},
		registerCompletionResolveProvider: (handler) => {
			completionResolve = handler;
			return disposable(() => {
				completionResolve = undefined;
			});
		},
		registerHoverProvider: (handler) => {
			hover = handler;
			return disposable(() => {
				hover = undefined;
			});
		},
		registerDefinitionProvider: (handler) => {
			definition = handler;
			return disposable(() => {
				definition = undefined;
			});
		},
		registerReferencesProvider: (handler) => {
			references = handler;
			return disposable(() => {
				references = undefined;
			});
		},
		registerWorkspaceSymbolProvider: (handler) => {
			workspaceSymbols = handler;
			return disposable(() => {
				workspaceSymbols = undefined;
			});
		},
		registerDocumentSymbolProvider: (handler) => {
			documentSymbols = handler;
			return disposable(() => {
				documentSymbols = undefined;
			});
		},
		registerCodeLensProvider: (handlers) => {
			codeLensProvide = handlers.provide;
			codeLensResolve = handlers.resolve;
			return disposable(() => {
				codeLensProvide = undefined;
				codeLensResolve = undefined;
			});
		},
		registerRenameProvider: (handlers) => {
			renamePrepare = handlers.prepare;
			renameApply = handlers.rename;
			return disposable(() => {
				renamePrepare = undefined;
				renameApply = undefined;
			});
		},
		registerCommand: (id, handler) => {
			commandHandlers.set(id, handler);
			return disposable(() => void commandHandlers.delete(id));
		},
		createDiagnosticsCollection: () => ({
			set: (uri, values) => void diagnostics.set(uri, values),
			clear: () => diagnostics.clear(),
			dispose: () => diagnostics.clear(),
		}),
		showInformationMessage: (message) => void messages.info.push(message),
		showWarningMessage: (message) => void messages.warning.push(message),
		showErrorMessage: (message) => void messages.error.push(message),
	};

	return {
		host,
		messages,
		diagnostics,
		emitDidOpen: async (document) => void (await onDidOpen?.(document)),
		emitDidChange: async (document) => void (await onDidChange?.(document)),
		callCompletion: async (args) => completion?.(args),
		callCompletionResolve: async (item) => completionResolve?.(item),
		callHover: async (args) => hover?.(args),
		callDefinition: async (args) => definition?.(args),
		callReferences: async (args) => references?.(args),
		callDocumentSymbols: async (document) => documentSymbols?.(document),
		callWorkspaceSymbols: async (query) => workspaceSymbols?.(query),
		callCodeLensProvide: async (document) => codeLensProvide?.(document),
		callCodeLensResolve: async (lens) => codeLensResolve?.(lens),
		callRenamePrepare: async (args) => renamePrepare?.(args),
		callRename: async (args) => renameApply?.(args),
		runCommand: async (id, ...args) => {
			await commandHandlers.get(id)?.(...args);
		},
	};
};
