import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

const personaSchema = strictObjectWithExtensions({
	description: z.string().min(1),
	traits: z.record(z.string(), z.unknown()).optional(),
	history: z.array(z.unknown()).optional(),
	tags: z.array(z.string().min(1)).optional(),
});

const scenarioStepSchema = strictObjectWithExtensions({
	trigger: z.record(z.string(), z.unknown()).optional(),
	expect: z.record(z.string(), z.unknown()).optional(),
	capture: z.record(z.string(), z.unknown()).optional(),
});

const scenarioSchema = strictObjectWithExtensions({
	tags: z.array(z.string().min(1)).optional(),
	context: strictObjectWithExtensions({
		persona: z.string().min(1).optional(),
		principal: z.record(z.string(), z.unknown()).optional(),
		session: z.record(z.string(), z.unknown()).optional(),
	}).optional(),
	steps: z.array(scenarioStepSchema),
});

/**
 * `personas` section authoring contract.
 */
export const personasSectionSchema = z.record(z.string(), personaSchema);

/**
 * `scenarios` section authoring contract.
 */
export const scenariosSectionSchema = z.record(z.string(), scenarioSchema);
