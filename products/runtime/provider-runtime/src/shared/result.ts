import type { RuntimeErrorKind, RuntimeResult } from "./types";

export const ok = <T>(value: T): RuntimeResult<T> => ({ ok: true, value });

export const fail = (
	kind: RuntimeErrorKind,
	message: string,
	details?: Readonly<Record<string, unknown>>,
): RuntimeResult<never> => ({
	ok: false,
	error: details === undefined ? { kind, message } : { kind, message, details },
});
