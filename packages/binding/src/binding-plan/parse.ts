import { type BindingPlan, bindingPlanSchema } from "./contracts";

/**
 * Validates and parses a binding plan artifact.
 *
 * @param value - Untrusted plan input.
 * @returns Parsed binding plan.
 *
 * @example
 * const plan = parseBindingPlan(rawPlan);
 */
export const parseBindingPlan = (value: unknown): BindingPlan =>
	bindingPlanSchema.parse(value);
