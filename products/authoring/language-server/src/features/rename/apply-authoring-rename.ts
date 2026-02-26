import {
	authoringRenameRequestSchema,
	authoringRenameResultSchema,
} from "../../contracts/rename-contracts";
import {
	planRenameWorkspaceEdit,
	resolveRenameSelection,
} from "../../internal/rename-planner";

/**
 * Applies rename edits for `textDocument/rename` handlers.
 *
 * @param value - Untrusted rename request.
 * @returns Structured rename result with workspace edits or conflict error.
 *
 * @example
 * const result = applyAuthoringRename({ context, position, newName: "next_name" });
 */
export const applyAuthoringRename = (value: unknown) => {
	const request = authoringRenameRequestSchema.parse(value);
	const selection = resolveRenameSelection(request);
	if (!selection.ok) {
		return authoringRenameResultSchema.parse(selection);
	}

	const edit = planRenameWorkspaceEdit(request, selection.declaration);
	if ("ok" in edit && !edit.ok) {
		return authoringRenameResultSchema.parse(edit);
	}

	return authoringRenameResultSchema.parse({
		ok: true,
		parity: selection.parity,
		edit,
	});
};
