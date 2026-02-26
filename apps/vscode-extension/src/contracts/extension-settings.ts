import { z } from "zod";

/**
 * Diagnostics publication mode for the extension adapter.
 */
export const gooiDiagnosticsModeSchema = z.enum(["push", "pull"]);

/**
 * Parsed extension settings used by activation and provider wiring.
 */
export const gooiExtensionSettingsSchema = z.object({
	contextPath: z.string().min(1).default(".gooi/authoring-context.json"),
	diagnosticsMode: gooiDiagnosticsModeSchema.default("push"),
	enableCodeLens: z.boolean().default(true),
});

/**
 * Extension settings value.
 */
export type GooiExtensionSettings = z.infer<typeof gooiExtensionSettingsSchema>;

/**
 * Parses untrusted extension configuration into a typed settings object.
 *
 * @param value - Untrusted settings payload.
 * @returns Parsed extension settings with defaults applied.
 *
 * @example
 * const settings = parseExtensionSettings({ diagnosticsMode: "pull" });
 */
export const parseExtensionSettings = (value: unknown): GooiExtensionSettings =>
	gooiExtensionSettingsSchema.parse(value);
