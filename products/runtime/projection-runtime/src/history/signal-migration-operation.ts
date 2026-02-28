import { errorsContracts } from "@gooi/projection-contracts/errors";
import type {
	ProjectionSourceRef,
	SignalMigrationOperation,
} from "@gooi/projection-contracts/plans";
import { readFieldPath } from "../shared/field-path";

const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);

const splitPath = (path: string): readonly string[] =>
	path.split(".").filter((segment) => segment.length > 0);

const isSafePath = (path: string): boolean => {
	const parts = splitPath(path);
	return (
		parts.length > 0 &&
		parts.every((segment) => !unsafePathSegments.has(segment))
	);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const setPathValue = (
	target: Record<string, unknown>,
	path: string,
	value: unknown,
): boolean => {
	const parts = splitPath(path);
	if (
		parts.length === 0 ||
		parts.some((part) => unsafePathSegments.has(part))
	) {
		return false;
	}
	let current: Record<string, unknown> = target;
	for (const part of parts.slice(0, -1)) {
		if (unsafePathSegments.has(part)) {
			return false;
		}
		const next = Object.hasOwn(current, part) ? current[part] : undefined;
		if (isRecord(next)) {
			current = next as Record<string, unknown>;
			continue;
		}
		const created = Object.create(null) as Record<string, unknown>;
		current[part] = created;
		current = created;
	}
	current[parts[parts.length - 1] as string] = value;
	return true;
};

const removePathValue = (
	target: Record<string, unknown>,
	path: string,
): boolean => {
	const parts = splitPath(path);
	if (
		parts.length === 0 ||
		parts.some((part) => unsafePathSegments.has(part))
	) {
		return false;
	}
	let current: Record<string, unknown> = target;
	for (const part of parts.slice(0, -1)) {
		if (unsafePathSegments.has(part) || !Object.hasOwn(current, part)) {
			return false;
		}
		const next = current[part];
		if (!isRecord(next)) {
			return false;
		}
		current = next as Record<string, unknown>;
	}
	delete current[parts[parts.length - 1] as string];
	return true;
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
	errorsContracts.createProjectionError(
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
			readonly error: ReturnType<typeof errorsContracts.createProjectionError>;
	  } => {
	if (operation.op === "set") {
		if (
			!isSafePath(operation.field) ||
			!setPathValue(payload, operation.field, operation.value)
		) {
			return {
				ok: false,
				error: buildSignalMigrationError(
					sourceRef,
					"Signal migration path is unsafe or invalid.",
					{ signalName, fromVersion, field: operation.field },
				),
			};
		}
		return { ok: true };
	}
	if (operation.op === "remove") {
		if (
			!isSafePath(operation.field) ||
			!removePathValue(payload, operation.field)
		) {
			return {
				ok: false,
				error: buildSignalMigrationError(
					sourceRef,
					"Signal migration path is unsafe or invalid.",
					{ signalName, fromVersion, field: operation.field },
				),
			};
		}
		return { ok: true };
	}
	if (operation.op === "copy" || operation.op === "rename") {
		if (!isSafePath(operation.from) || !isSafePath(operation.to)) {
			return {
				ok: false,
				error: buildSignalMigrationError(
					sourceRef,
					"Signal migration path is unsafe or invalid.",
					{
						signalName,
						fromVersion,
						from: operation.from,
						to: operation.to,
					},
				),
			};
		}
		const value = readFieldPath(payload, operation.from);
		if (!setPathValue(payload, operation.to, value)) {
			return {
				ok: false,
				error: buildSignalMigrationError(
					sourceRef,
					"Signal migration path is unsafe or invalid.",
					{
						signalName,
						fromVersion,
						to: operation.to,
					},
				),
			};
		}
		if (operation.op === "rename") {
			if (!removePathValue(payload, operation.from)) {
				return {
					ok: false,
					error: buildSignalMigrationError(
						sourceRef,
						"Signal migration path is unsafe or invalid.",
						{
							signalName,
							fromVersion,
							from: operation.from,
						},
					),
				};
			}
		}
		return { ok: true };
	}

	if (!isSafePath(operation.field)) {
		return {
			ok: false,
			error: buildSignalMigrationError(
				sourceRef,
				"Signal migration path is unsafe or invalid.",
				{ signalName, fromVersion, field: operation.field },
			),
		};
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
	if (!setPathValue(payload, operation.field, coerced.value)) {
		return {
			ok: false,
			error: buildSignalMigrationError(
				sourceRef,
				"Signal migration path is unsafe or invalid.",
				{ signalName, fromVersion, field: operation.field },
			),
		};
	}
	return { ok: true };
};
