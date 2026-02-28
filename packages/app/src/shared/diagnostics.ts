import type { CompileAppFailure } from "@gooi/app-facade-contracts/compile";
import type { AppFacadeDiagnostic } from "@gooi/app-facade-contracts/define";
import type { ZodIssue } from "zod";

type AppFacadeDiagnosticCode = AppFacadeDiagnostic["code"];
type CompileDiagnostic = CompileAppFailure["diagnostics"][number];

const renderPath = (root: string, path: readonly PropertyKey[]): string => {
	if (path.length === 0) {
		return root;
	}
	return `${root}.${path.map((segment) => String(segment)).join(".")}`;
};

const sortByPathAndMessage = <T extends { path: string; message: string }>(
	diagnostics: readonly T[],
): readonly T[] =>
	[...diagnostics].sort(
		(left, right) =>
			left.path.localeCompare(right.path) ||
			left.message.localeCompare(right.message),
	);

export const toFacadeDiagnostics = (
	issues: readonly ZodIssue[],
	input: {
		readonly code: AppFacadeDiagnosticCode;
		readonly rootPath: string;
	},
): readonly AppFacadeDiagnostic[] =>
	sortByPathAndMessage(
		issues.map((issue) => ({
			code: input.code,
			path: renderPath(input.rootPath, issue.path),
			message: issue.message,
		})),
	);

export const toCompileDiagnostics = (
	issues: readonly ZodIssue[],
	input: {
		readonly code: "facade_configuration_error";
		readonly rootPath: string;
	},
): readonly CompileDiagnostic[] =>
	sortByPathAndMessage(
		issues.map((issue) => ({
			severity: "error",
			code: input.code,
			path: renderPath(input.rootPath, issue.path),
			message: issue.message,
		})),
	);
