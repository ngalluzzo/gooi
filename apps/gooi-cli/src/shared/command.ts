export type CliOptionValue = string | boolean;
export type CliOptions = Readonly<Record<string, CliOptionValue>>;

export interface CliCommandContext {
	readonly options: CliOptions;
	readonly args: readonly string[];
	readonly readJsonInput: () => Promise<unknown>;
	readonly nowIso: () => string;
}

export interface CliCommand {
	readonly id: string;
	readonly summary: string;
	readonly run: (context: CliCommandContext) => Promise<unknown> | unknown;
}

export const getOptionString = (
	options: CliOptions,
	key: string,
): string | undefined => {
	const value = options[key];
	return typeof value === "string" ? value : undefined;
};

export const hasOption = (options: CliOptions, key: string): boolean => {
	const value = options[key];
	return value === true || typeof value === "string";
};
