import type {
	CompileDiagnostic,
	CompileEntrypointBundleResult,
} from "@gooi/app-spec-contracts/compiled";
import { z } from "zod";
import { appDefinitionSchema } from "../define/define";

export const compileAppInputSchema = z.object({
	definition: appDefinitionSchema,
	compilerVersion: z.string().min(1),
});

export type CompileAppInput = z.infer<typeof compileAppInputSchema>;

export interface CompileAppFailure {
	readonly ok: false;
	readonly diagnostics: readonly CompileDiagnostic[];
}

export type CompileAppResult =
	| CompileEntrypointBundleResult
	| CompileAppFailure;

export const parseCompileAppInput = (value: unknown): CompileAppInput =>
	compileAppInputSchema.parse(value);
