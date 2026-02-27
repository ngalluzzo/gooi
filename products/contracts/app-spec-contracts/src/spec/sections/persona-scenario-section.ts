import { z } from "zod";
import { strictObjectWithExtensions } from "../schema-utils";

const personaSchema = strictObjectWithExtensions({
	/** Required human-readable description of this persona's identity, role, and typical behaviors. */
	description: z.string().min(1),
	/** Optional map of named behavioral traits for this persona, used during generated trigger input synthesis. Shape is deferred to the section compiler. */
	traits: z.record(z.string(), z.unknown()).optional(),
	/** Optional ordered list of past interactions or context events seeded for this persona in scenario runs. Author order is preserved. */
	history: z.array(z.unknown()).optional(),
	/** Optional list of labels for grouping and selecting personas during tagged scenario suite execution. */
	tags: z.array(z.string().min(1)).optional(),
});

const scenarioStepSchema = strictObjectWithExtensions({
	/** Optional trigger step that executes a query, mutation, or route contract as a scenario action. Shape is deferred to the section compiler. */
	trigger: z.record(z.string(), z.unknown()).optional(),
	/** Optional expectation step that validates signals, query results, or flow outcomes produced by prior steps. Shape is deferred to the section compiler. */
	expect: z.record(z.string(), z.unknown()).optional(),
	/** Optional capture step that binds runtime output values for use as inputs in subsequent steps. Shape is deferred to the section compiler. */
	capture: z.record(z.string(), z.unknown()).optional(),
});

const scenarioSchema = strictObjectWithExtensions({
	/** Optional list of labels for grouping and filtering this scenario during selective suite runs (e.g., `smoke`, `edge-case`). */
	tags: z.array(z.string().min(1)).optional(),
	/** Optional runtime context seed applied before the first step executes. */
	context: strictObjectWithExtensions({
		/** Optional persona ID whose traits and history seed the runtime context for this scenario run. Must reference a declared persona. */
		persona: z.string().min(1).optional(),
		/** Optional principal context seed applied to the policy gate for this scenario run. Shape is deferred to the host principal contract. */
		principal: z.record(z.string(), z.unknown()).optional(),
		/** Optional session state seed applied before the first scenario step executes. Values are merged with declared session defaults. */
		session: z.record(z.string(), z.unknown()).optional(),
	}).optional(),
	/** Ordered list of steps (trigger, expect, capture) executed in sequence. Author order is preserved; steps may not be reordered by the runtime. */
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
