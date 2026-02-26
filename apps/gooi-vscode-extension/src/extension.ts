import {
	type ActivatedGooiExtension,
	activateExtension,
} from "./activation/activate-extension";
import { createVscodeHost } from "./activation/create-vscode-host";

let activeExtension: ActivatedGooiExtension | undefined;

/**
 * Activates the VS Code extension entrypoint.
 *
 * @returns Activation handle.
 *
 * @example
 * const handle = activate();
 */
export const activate = (): ActivatedGooiExtension => {
	activeExtension = activateExtension({ host: createVscodeHost() });
	return activeExtension;
};

/**
 * Deactivates the VS Code extension entrypoint.
 *
 * @example
 * deactivate();
 */
export const deactivate = (): void => {
	activeExtension?.dispose();
	activeExtension = undefined;
};
