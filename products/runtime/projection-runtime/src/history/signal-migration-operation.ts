import { createProjectionError } from "@gooi/projection-contracts/errors/projection-errors";
import type { ProjectionSourceRef } from "@gooi/projection-contracts/plans/projection-plan";
import type { SignalMigrationOperation } from "@gooi/projection-contracts/plans/signal-migration-plan";
import { readFieldPath } from "../shared/field-path";

const splitPath = (path: string): readonly string[] =>
	path.split(".").filter((segment) => segment.length > 0);

const setPathValue = (
	target: Record<string, unknown>,
	path: string,
	value: unknown,
): void => {
	const parts = splitPath(path);
	if (parts.length === 0) {
		return;
	}
	let current: Record<string, unknown> = target;
	for (const part of parts.slice(0, -1)) {
		const next = current[part];
		if (typeof next === "object" && next !== null) {
			current = next as Record<string, unknown>;
			continue;
		}
		current[part] = {};
		current = current[part] as Record<string, unknown>;
	}
	current[parts[parts.length - 1] as string] = value;
};

const removePathValue = (
	target: Record<string, unknown>,
	path: string,
): void => {
	const parts = splitPath(path);
	if (parts.length === 0) {
		return;
	}
	let current: Record<string, unknown> = target;
	for (const part of parts.slice(0, -1)) {
		const next = current[part];
		if (typeof next !== "object" || next === null) {
			return;
		}
		current = next as Record<string, unknown>;
	}
	delete current[parts[parts.length - 1] as string];
};

const toBoolean = (value: unknown): boolean => {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "number") {
		return value !== 0;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true" || normalized === "1" || normalized === "yes") {
			return true;
		}
		if (
			normalized === "false" ||
			normalized === "0" ||
			normalized === "no" ||
			normalized === ""
		) {
			return false;
		}
	}
	return Boolean(value);
};

const coerceValue = (
	value: unknown,
	to: "string" | "number" | "boolean",
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } => {
	if (to === "string") {
		return { ok: true, value: value === undefined ? "" : String(value) };
	}
	if (to === "boolean") {
		return { ok: true, value: toBoolean(value) };
	}
	const numeric = Number(value);
	if (Number.isNaN(numeric)) {
		return { ok: false };
	}
	return { ok: true, value: numeric };
};

/**
 * Builds a typed signal migration error payload.
 */
export const buildSignalMigrationError = (
	sourceRef: ProjectionSourceRef,
	message: string,
	details?: Readonly<Record<string, unknown>>,
) =>
	createProjectionError(
		"projection_signal_migration_error",
		message,
		sourceRef,
		details,
	);

/**
 * Applies one signal payload migration operation.
 */
export const applySignalMigrationOperation = (
	payload: Record<string, unknown>,
	operation: SignalMigrationOperation,
	sourceRef: ProjectionSourceRef,
	signalName: string,
	fromVersion: number,
):
	| { readonly ok: true }
	| {
			readonly ok: false;
			readonly error: ReturnType<typeof createProjectionError>;
	  } => {
	if (operation.op === "set") {
		setPathValue(payload, operation.field, operation.value);
		return { ok: true };
	}
	if (operation.op === "remove") {
		removePathValue(payload, operation.field);
		return { ok: true };
	}
	if (operation.op === "copy" || operation.op === "rename") {
		const value = readFieldPath(payload, operation.from);
		setPathValue(payload, operation.to, value);
		if (operation.op === "rename") {
			removePathValue(payload, operation.from);
		}
		return { ok: true };
	}

	const value = readFieldPath(payload, operation.field);
	const coerced = coerceValue(value, operation.to);
	if (!coerced.ok) {
		return {
			ok: false,
			error: buildSignalMigrationError(
				sourceRef,
				"Signal migration type coercion failed.",
				{ signalName, fromVersion, field: operation.field, to: operation.to },
			),
		};
	}
	setPathValue(payload, operation.field, coerced.value);
	return { ok: true };
};
