import type { CliOptions } from "./command";
import { CliError } from "./errors";

export interface CliIo {
	readonly readFile: (path: string) => Promise<string>;
	readonly writeFile: (path: string, value: string) => Promise<void>;
	readonly readStdin: () => Promise<string>;
	readonly writeStdout: (value: string) => void;
	readonly writeStderr: (value: string) => void;
	readonly isStdinTTY: () => boolean;
	readonly nowIso: () => string;
}

export const createProcessIo = (): CliIo => ({
	readFile: async (path) => Bun.file(path).text(),
	writeFile: async (path, value) => {
		await Bun.write(path, value);
	},
	readStdin: async () => Bun.stdin.text(),
	writeStdout: (value) => {
		process.stdout.write(value);
	},
	writeStderr: (value) => {
		process.stderr.write(value);
	},
	isStdinTTY: () => process.stdin.isTTY ?? false,
	nowIso: () => new Date().toISOString(),
});

const parseJson = (text: string, source: string): unknown => {
	try {
		return JSON.parse(text);
	} catch (error) {
		throw new CliError({
			code: "input_validation_error",
			message: `Input is not valid JSON (${source}).`,
			details: {
				...(error instanceof Error ? { cause: error.message } : {}),
			},
		});
	}
};

export const readJsonInput = async (
	options: CliOptions,
	io: CliIo,
): Promise<unknown> => {
	const fromOption = options.input;
	if (typeof fromOption === "string" && fromOption.length > 0) {
		if (fromOption === "-") {
			const stdin = (await io.readStdin()).trim();
			if (stdin.length === 0) {
				throw new CliError({
					code: "input_validation_error",
					message: "No JSON payload received on stdin.",
				});
			}
			return parseJson(stdin, "stdin");
		}
		const fileText = await io.readFile(fromOption);
		return parseJson(fileText, fromOption);
	}

	if (io.isStdinTTY()) {
		throw new CliError({
			code: "usage_error",
			message: "Command requires JSON input (--input <path>|- or stdin).",
		});
	}

	const stdin = (await io.readStdin()).trim();
	if (stdin.length === 0) {
		throw new CliError({
			code: "input_validation_error",
			message: "No JSON payload received on stdin.",
		});
	}
	return parseJson(stdin, "stdin");
};
