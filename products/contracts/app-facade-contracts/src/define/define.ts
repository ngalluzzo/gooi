import { type GooiAppSpec, specContracts } from "@gooi/app-spec-contracts/spec";
import { z } from "zod";

export const appFacadeDiagnosticCodeSchema = z.enum([
	"facade_input_error",
	"facade_configuration_error",
]);

export const appFacadeDiagnosticSchema = z.object({
	code: appFacadeDiagnosticCodeSchema,
	path: z.string().min(1),
	message: z.string().min(1),
});

export type AppFacadeDiagnostic = z.infer<typeof appFacadeDiagnosticSchema>;

export const defineAppInputSchema = z.object({
	spec: z.unknown(),
});

export type DefineAppInput = z.infer<typeof defineAppInputSchema>;

export const appDefinitionSchema = z.object({
	spec: specContracts.gooiAppSpecSchema,
});

export type AppDefinition = z.infer<typeof appDefinitionSchema>;

export interface DefineAppSuccess {
	readonly ok: true;
	readonly definition: AppDefinition;
}

export interface DefineAppFailure {
	readonly ok: false;
	readonly diagnostics: readonly AppFacadeDiagnostic[];
}

export type DefineAppResult = DefineAppSuccess | DefineAppFailure;

export const parseDefineAppInput = (value: unknown): DefineAppInput =>
	defineAppInputSchema.parse(value);

export const parseAppDefinition = (value: unknown): AppDefinition =>
	appDefinitionSchema.parse(value);

export const parseGooiAppSpec = (value: unknown): GooiAppSpec =>
	specContracts.parseGooiAppSpec(value);

export const gooiAppSpecSchema = specContracts.gooiAppSpecSchema;
