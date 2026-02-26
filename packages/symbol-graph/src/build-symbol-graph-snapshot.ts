import {
	type BuildSymbolGraphSnapshotInput,
	type SymbolGraphSnapshot,
	type SymbolReferenceEdge,
	symbolGraphSnapshotSchema,
} from "./contracts";
import { deriveSignalImpactEdges } from "./derive-signal-impact-edges";
import { sha256, stableStringify } from "./internal/stable-json";

/**
 * Builds a deterministic symbol graph snapshot.
 *
 * @param input - Snapshot build input.
 * @returns Deterministic symbol graph snapshot artifact.
 * @throws {Error} When reference edges include unknown symbol ids.
 *
 * @example
 * const snapshot = buildSymbolGraphSnapshot({
 *   sourceHash: "a".repeat(64),
 *   symbols: [],
 *   references: [],
 *   signalImpact: { actions: [], queries: [] },
 *   renameConstraints: [],
 * });
 */
export const buildSymbolGraphSnapshot = (
	input: BuildSymbolGraphSnapshotInput,
): SymbolGraphSnapshot => {
	const sortedSymbols = [...input.symbols].sort((left, right) =>
		left.id.localeCompare(right.id),
	);

	const derivedReferences = deriveSignalImpactEdges(input.signalImpact);
	const references = deduplicateReferences([
		...input.references,
		...derivedReferences,
	]).sort((left, right) => {
		if (left.relationship !== right.relationship) {
			return left.relationship.localeCompare(right.relationship);
		}
		if (left.fromSymbolId !== right.fromSymbolId) {
			return left.fromSymbolId.localeCompare(right.fromSymbolId);
		}
		return left.toSymbolId.localeCompare(right.toSymbolId);
	});

	enforceKnownSymbolReferences(
		sortedSymbols.map((symbol) => symbol.id),
		references,
	);

	const sortedRenameConstraints = [...input.renameConstraints].sort(
		(left, right) => left.symbolKind.localeCompare(right.symbolKind),
	);

	const snapshotContent = {
		artifactVersion: "1.0.0" as const,
		sourceHash: input.sourceHash,
		symbols: sortedSymbols,
		references,
		renameConstraints: sortedRenameConstraints,
	};

	const artifactHash = sha256(stableStringify(snapshotContent));

	return symbolGraphSnapshotSchema.parse({
		...snapshotContent,
		artifactHash,
	});
};

const deduplicateReferences = (
	references: readonly SymbolReferenceEdge[],
): SymbolReferenceEdge[] => {
	const map = new Map<string, SymbolReferenceEdge>();

	for (const edge of references) {
		map.set(
			`${edge.relationship}:${edge.fromSymbolId}:${edge.toSymbolId}`,
			edge,
		);
	}

	return [...map.values()];
};

const enforceKnownSymbolReferences = (
	symbolIds: readonly string[],
	references: readonly SymbolReferenceEdge[],
): void => {
	const knownSymbolIds = new Set(symbolIds);

	for (const reference of references) {
		if (!knownSymbolIds.has(reference.fromSymbolId)) {
			throw new Error(
				`Reference edge has unknown source symbol id: ${reference.fromSymbolId}`,
			);
		}
		if (!knownSymbolIds.has(reference.toSymbolId)) {
			throw new Error(
				`Reference edge has unknown target symbol id: ${reference.toSymbolId}`,
			);
		}
	}
};
