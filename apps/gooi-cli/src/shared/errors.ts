export type CliErrorCode =
	| "usage_error"
	| "input_validation_error"
	| "operation_error"
	| "internal_error";

const errorExitCodeByKind: Readonly<Record<CliErrorCode, number>> = {
	usage_error: 2,
	input_validation_error: 2,
	operation_error: 1,
	internal_error: 1,
};

export class CliError extends Error {
	readonly code: CliErrorCode;
	readonly details: Readonly<Record<string, unknown>> | undefined;
	readonly exitCode: number;

	constructor(input: {
		readonly code: CliErrorCode;
		readonly message: string;
		readonly details?: Readonly<Record<string, unknown>>;
		readonly exitCode?: number;
	}) {
		super(input.message);
		this.name = "CliError";
		this.code = input.code;
		this.details = input.details;
		this.exitCode = input.exitCode ?? errorExitCodeByKind[input.code];
	}
}

export const toCliError = (error: unknown): CliError => {
	if (error instanceof CliError) {
		return error;
	}
	if (error instanceof Error) {
		return new CliError({
			code: "internal_error",
			message: error.message,
		});
	}
	return new CliError({
		code: "internal_error",
		message: "Unknown CLI failure.",
	});
};
