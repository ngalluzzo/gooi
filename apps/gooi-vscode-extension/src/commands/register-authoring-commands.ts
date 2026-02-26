import {
	lockfileMismatchCommandPayloadSchema,
	parseFirstCommandArgument,
	runEntrypointCommandPayloadSchema,
	showAffectedQueriesCommandPayloadSchema,
	showProvidersCommandPayloadSchema,
} from "../contracts/command-payloads";
import type {
	GooiExtensionHost,
	HostDisposable,
} from "../contracts/host-ports";

/**
 * Optional runtime callbacks for command execution.
 */
export interface AuthoringCommandCallbacks {
	/** Executes one runtime-backed entrypoint action. */
	onRunEntrypoint?: (symbolId: string) => Promise<void>;
}

const commandIds = {
	runEntrypoint: "gooi.authoring.runEntrypoint",
	showProviders: "gooi.authoring.showProviders",
	showAffectedQueries: "gooi.authoring.showAffectedQueries",
	lockfileMismatch: "gooi.authoring.lockfileMismatch",
} as const;

/**
 * Registers first-party Gooi authoring commands.
 *
 * @param input - Host port and optional runtime callbacks.
 * @returns Disposable registrations.
 *
 * @example
 * const disposables = registerAuthoringCommands({ host });
 */
export const registerAuthoringCommands = (input: {
	host: GooiExtensionHost;
	callbacks?: AuthoringCommandCallbacks;
}): HostDisposable[] => {
	const runEntrypoint = input.host.registerCommand(
		commandIds.runEntrypoint,
		async (...args) => {
			const payload = parseFirstCommandArgument(
				runEntrypointCommandPayloadSchema,
				args,
			);
			if (input.callbacks?.onRunEntrypoint === undefined) {
				await input.host.showWarningMessage(
					`Runtime execution not configured for '${payload.symbolId}'.`,
				);
				return;
			}
			await input.callbacks.onRunEntrypoint(payload.symbolId);
		},
	);

	const showProviders = input.host.registerCommand(
		commandIds.showProviders,
		async (...args) => {
			const payload = parseFirstCommandArgument(
				showProvidersCommandPayloadSchema,
				args,
			);
			await input.host.showInformationMessage(
				`Providers for capability '${payload.capabilityId}'.`,
			);
		},
	);

	const showAffectedQueries = input.host.registerCommand(
		commandIds.showAffectedQueries,
		async (...args) => {
			const payload = parseFirstCommandArgument(
				showAffectedQueriesCommandPayloadSchema,
				args,
			);
			const querySummary = payload.querySymbolIds.join(", ") || "none";
			await input.host.showInformationMessage(
				`Signal '${payload.signalSymbolId}' affects: ${querySummary}.`,
			);
		},
	);

	const lockfileMismatch = input.host.registerCommand(
		commandIds.lockfileMismatch,
		async (...args) => {
			const payload = parseFirstCommandArgument(
				lockfileMismatchCommandPayloadSchema,
				args,
			);
			await input.host.showWarningMessage(
				`Lockfile mismatch blocks runtime command for '${payload.symbolId}'.`,
			);
		},
	);

	return [runEntrypoint, showProviders, showAffectedQueries, lockfileMismatch];
};
