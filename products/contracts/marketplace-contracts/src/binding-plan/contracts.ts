import { z } from "zod";
import { capabilityBindingResolutionSchema } from "../reachability/contracts";
import { semverSchema } from "../shared/semver";

/**
 * Binding resolution entry for one required capability port.
 */
export const capabilityBindingSchema = z.object({
	portId: z.string().min(1),
	portVersion: semverSchema,
	resolution: capabilityBindingResolutionSchema,
});

/**
 * Required capability binding model with reachability classification.
 */
export type CapabilityBinding = z.infer<typeof capabilityBindingSchema>;

/**
 * Deployment binding plan resolved for one app environment.
 */
export const bindingPlanSchema = z.object({
	appId: z.string().min(1),
	environment: z.string().min(1),
	hostApiVersion: semverSchema,
	capabilityBindings: z.array(capabilityBindingSchema).min(1),
});

/**
 * Resolved capability binding plan.
 */
export type BindingPlan = z.infer<typeof bindingPlanSchema>;
