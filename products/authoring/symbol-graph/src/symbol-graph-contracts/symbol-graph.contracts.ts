import { z } from "zod";

/**
 * Artifact version for symbol graph snapshots.
 */
export const symbolGraphArtifactVersionSchema = z.literal("1.0.0");

/**
 * Symbol kinds represented in the authoring symbol graph.
 */
export const symbolKindSchema = z.enum([
	"entrypoint",
	"signal",
	"capability",
	"projection",
	"action",
	"route",
	"step_binding",
	"expression_variable",
	"ambient_symbol",
]);

const symbolLocationSchema = z.object({
	path: z.string().min(1),
	line: z.number().int().nonnegative(),
	character: z.number().int().nonnegative(),
});

/**
 * One symbol in the symbol graph.
 */
export const symbolGraphSymbolSchema = z.object({
	id: z.string().min(1),
	kind: symbolKindSchema,
	name: z.string().min(1),
	location: symbolLocationSchema,
	ownerSymbolId: z.string().min(1).optional(),
});

/**
 * Relationship kinds represented in the symbol reference graph.
 */
export const symbolRelationshipSchema = z.enum([
	"references",
	"emits_signal",
	"refresh_subscription",
	"impacts_query",
]);

/**
 * One reference edge in the symbol graph.
 */
export const symbolReferenceEdgeSchema = z.object({
	fromSymbolId: z.string().min(1),
	toSymbolId: z.string().min(1),
	relationship: symbolRelationshipSchema,
});

/**
 * Rename policy for one symbol kind.
 */
export const renameConstraintSchema = z.object({
	symbolKind: symbolKindSchema,
	renameable: z.boolean(),
	blockedReason: z.string().min(1).optional(),
});

/**
 * Symbol graph snapshot artifact.
 */
export const symbolGraphSnapshotSchema = z.object({
	artifactVersion: symbolGraphArtifactVersionSchema,
	sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
	artifactHash: z.string().regex(/^[a-f0-9]{64}$/),
	symbols: z.array(symbolGraphSymbolSchema),
	references: z.array(symbolReferenceEdgeSchema),
	renameConstraints: z.array(renameConstraintSchema),
});

/**
 * Parsed symbol graph symbol.
 */
export type SymbolGraphSymbol = z.infer<typeof symbolGraphSymbolSchema>;

/**
 * Parsed symbol reference edge.
 */
export type SymbolReferenceEdge = z.infer<typeof symbolReferenceEdgeSchema>;

/**
 * Parsed symbol graph snapshot.
 */
export type SymbolGraphSnapshot = z.infer<typeof symbolGraphSnapshotSchema>;

/**
 * Input payload for signal impact edge derivation.
 */
export interface SignalImpactDerivationInput {
	/** Actions and their emitted signals. */
	readonly actions: readonly {
		readonly actionSymbolId: string;
		readonly emittedSignalSymbolIds: readonly string[];
	}[];
	/** Queries and their refresh subscriptions. */
	readonly queries: readonly {
		readonly querySymbolId: string;
		readonly refreshOnSignalSymbolIds: readonly string[];
	}[];
}

/**
 * Input payload for symbol graph snapshot creation.
 */
export interface BuildSymbolGraphSnapshotInput {
	/** Content hash of source artifacts used to build the snapshot. */
	readonly sourceHash: string;
	/** Base symbol table. */
	readonly symbols: readonly SymbolGraphSymbol[];
	/** Base references before derived signal impact edges are added. */
	readonly references: readonly SymbolReferenceEdge[];
	/** Signal impact derivation input. */
	readonly signalImpact: SignalImpactDerivationInput;
	/** Rename constraints by symbol kind. */
	readonly renameConstraints: readonly z.infer<typeof renameConstraintSchema>[];
}
