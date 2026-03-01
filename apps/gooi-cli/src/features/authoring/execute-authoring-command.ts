import { executeAuthoringCliEnvelope } from "@gooi/language-server/features/cli/execute";
import type { CliCommand } from "../../shared/command";

type AuthoringOperation = "diagnose" | "complete" | "rename" | "index.build";

const createAuthoringCommand = (
	id: string,
	summary: string,
	operation: AuthoringOperation,
): CliCommand => ({
	id,
	summary,
	run: async (context) => {
		const payload = await context.readJsonInput();
		return executeAuthoringCliEnvelope({
			envelopeVersion: "1.0.0",
			requestId: `gooi-cli:${operation}:${Date.now()}`,
			requestedAt: context.nowIso(),
			operation,
			payload,
		});
	},
});

export const createAuthoringDiagnoseCommand = (): CliCommand =>
	createAuthoringCommand(
		"authoring diagnose",
		"Run authoring diagnostics over one read context payload.",
		"diagnose",
	);

export const createAuthoringCompleteCommand = (): CliCommand =>
	createAuthoringCommand(
		"authoring complete",
		"Run authoring completion for one context and position payload.",
		"complete",
	);

export const createAuthoringRenameCommand = (): CliCommand =>
	createAuthoringCommand(
		"authoring rename",
		"Apply authoring rename using typed authoring rename contracts.",
		"rename",
	);

export const createAuthoringIndexBuildCommand = (): CliCommand =>
	createAuthoringCommand(
		"authoring index build",
		"Build capability index snapshot from authoring index payload input.",
		"index.build",
	);
