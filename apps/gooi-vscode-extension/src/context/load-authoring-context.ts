import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
	type AuthoringReadContext,
	parseAuthoringReadContext,
} from "@gooi/product-authoring-lsp/contracts/read-context";

/**
 * Loads and parses the workspace authoring context artifact.
 *
 * @param input - Workspace root and relative artifact path.
 * @returns Parsed authoring read context.
 *
 * @example
 * const context = loadAuthoringContext({
 *   workspaceRoot: "/workspace/gooi",
 *   contextPath: ".gooi/authoring-context.json",
 * });
 */
export const loadAuthoringContext = (input: {
	workspaceRoot: string;
	contextPath: string;
}): AuthoringReadContext => {
	const absolutePath = resolve(input.workspaceRoot, input.contextPath);
	const rawText = readFileSync(absolutePath, "utf8");
	const parsedJson = JSON.parse(rawText) as unknown;
	return parseAuthoringReadContext(parsedJson);
};
