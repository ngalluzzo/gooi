import type { CliOptions } from "./command";

export interface ParsedArgv {
	readonly positionals: readonly string[];
	readonly options: CliOptions;
}

export const parseArgv = (argv: readonly string[]): ParsedArgv => {
	const options: Record<string, string | boolean> = {};
	const positionals: string[] = [];

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (token === undefined) {
			break;
		}
		if (!token.startsWith("--")) {
			positionals.push(token);
			continue;
		}

		const raw = token.slice(2);
		if (raw.length === 0) {
			continue;
		}

		const equals = raw.indexOf("=");
		if (equals >= 0) {
			const key = raw.slice(0, equals);
			const value = raw.slice(equals + 1);
			options[key] = value;
			continue;
		}

		const next = argv[index + 1];
		if (next !== undefined && !next.startsWith("--")) {
			options[raw] = next;
			index += 1;
			continue;
		}

		options[raw] = true;
	}

	return {
		positionals,
		options,
	};
};
