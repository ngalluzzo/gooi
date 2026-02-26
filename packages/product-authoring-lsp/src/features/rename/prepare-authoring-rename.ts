import {
	authoringPrepareRenameRequestSchema,
	authoringPrepareRenameResultSchema,
} from "../../contracts/rename-contracts";
import { resolveRenameSelection } from "../../internal/rename-planner";

/**
 * Preflights rename viability for `textDocument/prepareRename` handlers.
 *
 * @param value - Untrusted prepare-rename request.
 * @returns Structured prepare-rename result.
 *
 * @example
 * const result = prepareAuthoringRename({ context, position: { line: 5, character: 12 } });
 */
export const prepareAuthoringRename = (value: unknown) => {
	const request = authoringPrepareRenameRequestSchema.parse(value);
	const selection = resolveRenameSelection(request);
	if (!selection.ok) {
		return authoringPrepareRenameResultSchema.parse(selection);
	}

	const declaration = selection.declaration;
	return authoringPrepareRenameResultSchema.parse({
		ok: true,
		parity: selection.parity,
		symbolId: declaration.id,
		placeholder: declaration.name,
		range: {
			start: {
				line: declaration.location.line,
				character: declaration.location.character,
			},
			end: {
				line: declaration.location.line,
				character: declaration.location.character + declaration.name.length,
			},
		},
	});
};
