/**
 * Canonical binding contract API.
 */
import {
	bindingErrorSchema,
	bindingResultSchema,
	parseBindingError,
	parseBindingResult,
	surfaceBindMapSchema,
} from "./binding";

export {
	bindingErrorSchema,
	bindingResultSchema,
	parseBindingError,
	parseBindingResult,
	surfaceBindMapSchema,
};
export type { BindingError, BindingResult } from "./binding";

export const binding = Object.freeze({
	surfaceBindMapSchema,
	bindingErrorSchema,
	bindingResultSchema,
	parseBindingResult,
	parseBindingError,
});
