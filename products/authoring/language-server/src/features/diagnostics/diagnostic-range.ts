const defaultRange = {
	start: { line: 0, character: 0 },
	end: { line: 0, character: 1 },
} as const;

/**
 * Finds a deterministic range from a token in document text.
 */
export const findDiagnosticRangeFromToken = (
	documentText: string,
	token: string | undefined,
) => {
	if (token === undefined || token.length === 0) {
		return defaultRange;
	}

	const lines = documentText.split(/\r?\n/u);
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
		const line = lines[lineIndex] ?? "";
		const character = line.indexOf(token);
		if (character >= 0) {
			return {
				start: { line: lineIndex, character },
				end: { line: lineIndex, character: character + token.length },
			};
		}
	}

	return defaultRange;
};
