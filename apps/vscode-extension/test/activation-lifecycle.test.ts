import { afterEach, describe, expect, test } from "bun:test";

import { activateExtension } from "../src/activation/activate-extension";
import { createAuthoringWorkspaceFixture } from "./fixtures/create-authoring-workspace.fixture";
import { createExtensionHostFixture } from "./fixtures/create-extension-host.fixture";

const cleanup: Array<() => void> = [];

afterEach(() => {
	while (cleanup.length > 0) {
		cleanup.pop()?.();
	}
});

describe("activateExtension", () => {
	test("activates with fixture workspace and starts lifecycle handlers", async () => {
		const workspace = createAuthoringWorkspaceFixture();
		cleanup.push(workspace.dispose);
		const hostFixture = createExtensionHostFixture({
			workspaceRoot: workspace.workspaceRoot,
		});

		const activation = activateExtension({ host: hostFixture.host });
		cleanup.push(() => activation.dispose());

		expect(activation.settings.contextPath).toBe(
			".gooi/authoring-context.json",
		);
		expect(activation.settings.telemetryEnabled).toBe(false);

		await hostFixture.emitDidOpen({
			uri: workspace.documentUri,
			path: workspace.documentPath,
			text: workspace.documentText,
			version: 1,
		});

		expect(hostFixture.diagnostics.has(workspace.documentUri)).toBe(true);
	});

	test("fails activation when workspace is missing", () => {
		const hostFixture = createExtensionHostFixture({ workspaceRoot: "" });
		hostFixture.host.getWorkspaceRootPath = () => undefined;

		expect(() => activateExtension({ host: hostFixture.host })).toThrow();
		expect(hostFixture.messages.error).toHaveLength(1);
	});
});
