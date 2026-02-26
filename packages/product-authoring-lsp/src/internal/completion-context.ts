import type { AuthoringPosition } from "../contracts/positions";

import { getLineTextAtPosition } from "./document-token";

export type AuthoringCompletionDomain = "capability" | "signal" | "mixed";

const getIndent = (line: string): number => line.search(/[^ ]|$/u);

const getNearestScopeHeader = (input: {
	readonly documentText: string;
	readonly line: number;
}): string => {
	const lines = input.documentText.split(/\r?\n/u);
	const currentLine = lines[input.line] ?? "";
	const currentIndent = getIndent(currentLine);

	for (let index = input.line - 1; index >= 0; index -= 1) {
		const line = lines[index] ?? "";
		if (line.trim().length === 0) {
			continue;
		}
		if (getIndent(line) < currentIndent && line.trim().endsWith(":")) {
			return line.trim();
		}
	}
	return "";
};

/**
 * Infers completion domain by lightweight YAML scope context.
 *
 * @param input - Document text and completion position.
 * @returns Domain used to scope completion candidates.
 *
 * @example
 * const domain = inferCompletionDomain({ documentText, position });
 */
export const inferCompletionDomain = (input: {
	readonly documentText: string;
	readonly position: AuthoringPosition;
}): AuthoringCompletionDomain => {
	const lineText = getLineTextAtPosition(input);
	const header = getNearestScopeHeader({
		documentText: input.documentText,
		line: input.position.line,
	});

	if (header === "do:") {
		return "capability";
	}
	if (header === "emits:" || header === "refresh_on_signals:") {
		return "signal";
	}

	if (lineText.includes("refresh_on_signals") || lineText.includes("emits")) {
		return "signal";
	}
	if (lineText.includes("do:")) {
		return "capability";
	}
	return "mixed";
};
