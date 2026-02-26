import type { AuthoringPosition } from "../contracts/positions";

const tokenCharacter = /[a-zA-Z0-9_.:-]/;

export interface DocumentToken {
	readonly value: string;
	readonly startCharacter: number;
	readonly endCharacter: number;
}

const getLine = (documentText: string, line: number): string | undefined => {
	const lines = documentText.split(/\r?\n/u);
	return lines[line];
};

/**
 * Resolves the current line text at a zero-based document position.
 *
 * @param input - Document text and zero-based position.
 * @returns Line text at position, or an empty string when out of bounds.
 *
 * @example
 * const line = getLineTextAtPosition({ documentText, position: { line: 0, character: 0 } });
 */
export const getLineTextAtPosition = (input: {
	readonly documentText: string;
	readonly position: AuthoringPosition;
}): string => getLine(input.documentText, input.position.line) ?? "";

/**
 * Resolves token boundaries and value at a zero-based document position.
 *
 * @param input - Document text and zero-based position.
 * @returns Token details, or `null` when no token exists at position.
 *
 * @example
 * const token = getTokenAtPosition({ documentText, position: { line: 1, character: 4 } });
 */
export const getTokenAtPosition = (input: {
	readonly documentText: string;
	readonly position: AuthoringPosition;
}): DocumentToken | null => {
	const lineText = getLineTextAtPosition(input);
	if (lineText.length === 0) {
		return null;
	}

	const boundedCharacter = Math.max(
		0,
		Math.min(input.position.character, lineText.length - 1),
	);

	if (!tokenCharacter.test(lineText[boundedCharacter] ?? "")) {
		return null;
	}

	let start = boundedCharacter;
	while (start > 0 && tokenCharacter.test(lineText[start - 1] ?? "")) {
		start -= 1;
	}

	let end = boundedCharacter;
	while (end < lineText.length && tokenCharacter.test(lineText[end] ?? "")) {
		end += 1;
	}

	const value = lineText.slice(start, end);
	if (value.length === 0) {
		return null;
	}

	return {
		value,
		startCharacter: start,
		endCharacter: end,
	};
};
