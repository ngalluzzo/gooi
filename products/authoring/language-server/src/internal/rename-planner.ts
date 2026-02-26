import type { SymbolGraphSymbol } from "@gooi/symbol-graph/contracts";

import type { AuthoringParityState } from "../contracts/parity";
import type {
	AuthoringPrepareRenameRequest,
	AuthoringRenameRequest,
	AuthoringWorkspaceEdit,
} from "../contracts/rename-contracts";
import { getTokenAtPosition } from "./document-token";
import { evaluateAuthoringReadParity } from "./lockfile-parity";
import { findSymbolByName, resolveDefinitionSymbol } from "./symbol-lookup";

interface RenameFailure {
	readonly ok: false;
	readonly parity: AuthoringParityState;
	readonly error: {
		readonly code: "rename_conflict_error" | "authoring_symbol_error";
		readonly message: string;
	};
}

interface RenameSelection {
	readonly ok: true;
	readonly parity: AuthoringParityState;
	readonly declaration: SymbolGraphSymbol;
}

const bySymbolLocation = (
	left: SymbolGraphSymbol,
	right: SymbolGraphSymbol,
): number => {
	if (left.location.line !== right.location.line) {
		return left.location.line - right.location.line;
	}
	if (left.location.character !== right.location.character) {
		return left.location.character - right.location.character;
	}
	return left.id.localeCompare(right.id);
};

const resolveSelectedSymbol = (
	request: Pick<
		AuthoringPrepareRenameRequest,
		"context" | "position" | "symbolRef"
	>,
): SymbolGraphSymbol | undefined => {
	if (request.symbolRef !== undefined) {
		return request.context.symbolGraphSnapshot.symbols.find(
			(symbol) => symbol.id === request.symbolRef?.symbolId,
		);
	}

	const token = getTokenAtPosition({
		documentText: request.context.documentText,
		position: request.position,
	});
	if (token === null) {
		return undefined;
	}
	return findSymbolByName(request.context.symbolGraphSnapshot, token.value);
};

/**
 * Resolves rename declaration symbol and enforces rename constraints.
 *
 * @param request - Prepare-rename compatible request fields.
 * @returns Rename selection or structured failure.
 */
export const resolveRenameSelection = (
	request: Pick<
		AuthoringPrepareRenameRequest,
		"context" | "position" | "symbolRef"
	>,
): RenameSelection | RenameFailure => {
	const parity = evaluateAuthoringReadParity(request.context);
	const selected = resolveSelectedSymbol(request);
	if (selected === undefined) {
		return {
			ok: false,
			parity,
			error: {
				code: "authoring_symbol_error",
				message:
					"No symbol could be resolved for rename at the requested selector.",
			},
		};
	}

	const declaration = resolveDefinitionSymbol(
		request.context.symbolGraphSnapshot,
		selected,
	).declaration;

	const renameConstraint =
		request.context.symbolGraphSnapshot.renameConstraints.find(
			(constraint) => constraint.symbolKind === declaration.kind,
		);
	if (renameConstraint !== undefined && !renameConstraint.renameable) {
		return {
			ok: false,
			parity,
			error: {
				code: "rename_conflict_error",
				message:
					renameConstraint.blockedReason ??
					`Symbol kind ${declaration.kind} is not renameable.`,
			},
		};
	}

	return {
		ok: true,
		parity,
		declaration,
	};
};

/**
 * Plans workspace edits for one rename request after preflight checks.
 *
 * @param request - Parsed rename request.
 * @param declaration - Rename declaration symbol.
 * @returns Workspace edit payload or structured failure.
 */
export const planRenameWorkspaceEdit = (
	request: AuthoringRenameRequest,
	declaration: SymbolGraphSymbol,
): AuthoringWorkspaceEdit | RenameFailure => {
	if (request.newName === declaration.name) {
		return {
			ok: false,
			parity: evaluateAuthoringReadParity(request.context),
			error: {
				code: "rename_conflict_error",
				message: "Rename target must differ from the current symbol name.",
			},
		};
	}

	const conflictingSymbol = request.context.symbolGraphSnapshot.symbols.find(
		(symbol) =>
			symbol.id !== declaration.id &&
			symbol.kind === declaration.kind &&
			symbol.name === request.newName,
	);
	if (conflictingSymbol !== undefined) {
		return {
			ok: false,
			parity: evaluateAuthoringReadParity(request.context),
			error: {
				code: "rename_conflict_error",
				message: `Rename target '${request.newName}' already exists for symbol kind '${declaration.kind}'.`,
			},
		};
	}

	const referenceSymbols = request.context.symbolGraphSnapshot.references
		.filter(
			(edge) =>
				edge.relationship === "references" &&
				edge.toSymbolId === declaration.id,
		)
		.map((edge) =>
			request.context.symbolGraphSnapshot.symbols.find(
				(symbol) => symbol.id === edge.fromSymbolId,
			),
		)
		.filter((symbol): symbol is SymbolGraphSymbol => symbol !== undefined);

	const symbolsToEdit = [declaration, ...referenceSymbols].sort(
		bySymbolLocation,
	);
	const changes = symbolsToEdit.map((symbol) => {
		const newText =
			symbol.id === declaration.id
				? request.newName
				: symbol.kind === "expression_variable" &&
						declaration.kind === "step_binding"
					? [request.newName, ...symbol.name.split(".").slice(1)].join(".")
					: request.newName;
		return {
			documentUri: request.context.documentUri,
			documentPath: symbol.location.path,
			symbolId: symbol.id,
			range: {
				start: {
					line: symbol.location.line,
					character: symbol.location.character,
				},
				end: {
					line: symbol.location.line,
					character: symbol.location.character + symbol.name.length,
				},
			},
			newText,
		};
	});

	return { changes };
};
