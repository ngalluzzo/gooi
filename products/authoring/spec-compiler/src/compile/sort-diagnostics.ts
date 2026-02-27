import type {
	CompileDiagnostic,
	DiagnosticSeverity,
} from "@gooi/app-spec-contracts/compiled";

const severityRank: Record<DiagnosticSeverity, number> = {
	error: 0,
	warning: 1,
	info: 2,
};

const compareLexical = (left: string, right: string): number =>
	left.localeCompare(right);

/**
 * Sorts diagnostics into deterministic order for stable CI output.
 *
 * @param diagnostics - Diagnostics emitted from compiler phases.
 * @returns Stable-sorted diagnostics.
 */
export const sortDiagnostics = (
	diagnostics: readonly CompileDiagnostic[],
): readonly CompileDiagnostic[] =>
	[...diagnostics].sort((left, right) => {
		const severityDelta =
			severityRank[left.severity] - severityRank[right.severity];
		if (severityDelta !== 0) {
			return severityDelta;
		}
		const pathDelta = compareLexical(left.path, right.path);
		if (pathDelta !== 0) {
			return pathDelta;
		}
		const codeDelta = compareLexical(left.code, right.code);
		if (codeDelta !== 0) {
			return codeDelta;
		}
		const messageDelta = compareLexical(left.message, right.message);
		if (messageDelta !== 0) {
			return messageDelta;
		}
		return compareLexical(left.hint ?? "", right.hint ?? "");
	});
