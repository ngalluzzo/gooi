import { applyAuthoringRename } from "@gooi/language-server/features/rename/apply";
import { prepareAuthoringRename } from "@gooi/language-server/features/rename/prepare";
import { makeCheck } from "./check-helpers";
import type {
	AuthoringConformanceCheck,
	RunAuthoringConformanceInput,
} from "./contracts";

export const buildRenameChecks = (
	input: RunAuthoringConformanceInput,
): AuthoringConformanceCheck[] => {
	const prepareRename = prepareAuthoringRename({
		context: input.context,
		position: input.positions.expressionReference,
	});
	const rename = applyAuthoringRename({
		context: input.context,
		position: input.positions.expressionReference,
		newName: input.renameTarget,
	});
	const renameCollision = applyAuthoringRename({
		context: input.context,
		position: input.positions.expressionReference,
		newName: input.renameCollisionTarget,
	});

	return [
		makeCheck({
			id: "rename_safety",
			passed:
				prepareRename.ok === true &&
				rename.ok === true &&
				renameCollision.ok === false,
			detail:
				"Rename preflight, edit generation, and conflict rejection are enforced.",
		}),
	];
};
