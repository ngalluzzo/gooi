import type { CliErrorCode } from "./errors";

export interface CliSuccessEnvelope {
	readonly ok: true;
	readonly command: string;
	readonly result: unknown;
	readonly timings: {
		readonly startedAt: string;
		readonly completedAt: string;
		readonly durationMs: number;
	};
}

export interface CliErrorEnvelope {
	readonly ok: false;
	readonly command: string;
	readonly error: {
		readonly code: CliErrorCode;
		readonly message: string;
		readonly details?: Readonly<Record<string, unknown>>;
	};
	readonly timings: {
		readonly startedAt: string;
		readonly completedAt: string;
		readonly durationMs: number;
	};
}

export type CliEnvelope = CliSuccessEnvelope | CliErrorEnvelope;
