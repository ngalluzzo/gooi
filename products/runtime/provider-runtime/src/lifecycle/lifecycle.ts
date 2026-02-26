import { fail, ok } from "../shared/result";
import type { ActivatedProvider, RuntimeResult } from "../shared/types";

/**
 * Deactivates an activated provider instance.
 */
export const deactivateProvider = async (
	activated: ActivatedProvider,
): Promise<RuntimeResult<void>> => {
	try {
		await activated.instance.deactivate();
		return ok(undefined);
	} catch (error) {
		return fail("activation_error", "Provider deactivation failed.", {
			cause: error instanceof Error ? error.message : String(error),
		});
	}
};
