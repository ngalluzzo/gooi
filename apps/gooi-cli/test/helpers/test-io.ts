import type { CliIo } from "../../src/shared/input";

export interface TestIoHarness {
	readonly io: CliIo;
	readonly stdout: () => string;
	readonly stderr: () => string;
}

export const createTestIo = (input?: {
	readonly stdin?: string;
	readonly files?: Readonly<Record<string, string>>;
	readonly isStdinTTY?: boolean;
}): TestIoHarness => {
	const files = new Map<string, string>(Object.entries(input?.files ?? {}));
	let stdout = "";
	let stderr = "";
	const stdin = input?.stdin ?? "";

	const io: CliIo = {
		readFile: async (path) => files.get(path) ?? "",
		writeFile: async (path, value) => {
			files.set(path, value);
		},
		readStdin: async () => stdin,
		writeStdout: (value) => {
			stdout += value;
		},
		writeStderr: (value) => {
			stderr += value;
		},
		isStdinTTY: () => input?.isStdinTTY ?? false,
		nowIso: () => "2026-03-01T00:00:00.000Z",
	};

	return {
		io,
		stdout: () => stdout,
		stderr: () => stderr,
	};
};
