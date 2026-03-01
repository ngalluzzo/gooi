import { parse as parseYaml } from "yaml";
import {
	type CliCommandContext,
	type CliOptions,
	getOptionString,
} from "./command";
import { CliError } from "./errors";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null;

const parseSpecText = (path: string, source: string): unknown => {
	if (source.endsWith(".json")) {
		try {
			return JSON.parse(path);
		} catch (error) {
			throw new CliError({
				code: "input_validation_error",
				message: `Spec file is not valid JSON (${source}).`,
				details: {
					...(error instanceof Error ? { cause: error.message } : {}),
				},
			});
		}
	}
	try {
		return parseYaml(path);
	} catch (error) {
		throw new CliError({
			code: "input_validation_error",
			message: `Spec file is not valid YAML (${source}).`,
			details: {
				...(error instanceof Error ? { cause: error.message } : {}),
			},
		});
	}
};

const unwrapSpecInput = (value: unknown): unknown => {
	if (!isRecord(value)) {
		return value;
	}
	if (!Object.hasOwn(value, "spec")) {
		return value;
	}
	return value.spec;
};

const readSpecFromFile = async (options: CliOptions): Promise<unknown> => {
	const path = getOptionString(options, "spec");
	if (path === undefined) {
		return undefined;
	}
	const text = await Bun.file(path).text();
	return parseSpecText(text, path);
};

export const readSpecInput = async (
	context: CliCommandContext,
): Promise<unknown> => {
	const fromSpecFile = await readSpecFromFile(context.options);
	if (fromSpecFile !== undefined) {
		return fromSpecFile;
	}
	return unwrapSpecInput(await context.readJsonInput());
};
