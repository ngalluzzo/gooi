import { z } from "zod";

/**
 * Stable identifiers for known cross-client authoring deviations.
 */
export const authoringClientDeviationIdSchema = z.enum([
	"diagnostics_mode_transport",
	"runtime_lens_parity_gate",
	"workspace_root_resolution",
]);

/**
 * One cataloged client deviation and mitigation guidance entry.
 */
export const authoringClientDeviationSchema = z.object({
	id: authoringClientDeviationIdSchema,
	deviation: z.string().min(1),
	mitigation: z.string().min(1),
});

/**
 * Deterministic catalog of client-specific deviations and mitigations.
 */
export const authoringClientDeviationCatalogSchema = z
	.array(authoringClientDeviationSchema)
	.min(1)
	.superRefine((entries, context) => {
		const ids = entries.map((entry) => entry.id);
		const sorted = [...ids].sort((left, right) => left.localeCompare(right));
		if (ids.some((id, index) => id !== sorted[index])) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Client deviation catalog entries must be sorted lexically by id.",
			});
		}
	});

/**
 * Parsed client deviation entry.
 */
export type AuthoringClientDeviation = z.infer<
	typeof authoringClientDeviationSchema
>;

/**
 * Parsed deterministic client deviation catalog.
 */
export type AuthoringClientDeviationCatalog = z.infer<
	typeof authoringClientDeviationCatalogSchema
>;

/**
 * Canonical cross-client deviation catalog with deterministic mitigations.
 */
export const authoringClientDeviationCatalog =
	authoringClientDeviationCatalogSchema.parse([
		{
			id: "diagnostics_mode_transport",
			deviation:
				"Clients may prefer push diagnostics while protocol consumers can request pull diagnostics.",
			mitigation:
				"Expose one typed diagnostics contract and keep push/pull mode selection explicit in client settings.",
		},
		{
			id: "runtime_lens_parity_gate",
			deviation:
				"Runtime-backed code-lens commands can be unavailable under lockfile parity mismatch.",
			mitigation:
				"Emit typed lockfile mismatch diagnostics and block runtime commands without bypass paths.",
		},
		{
			id: "workspace_root_resolution",
			deviation:
				"Editor adapters may resolve workspace roots differently in multi-root environments.",
			mitigation:
				"Require explicit context artifact path settings and evaluate document state through typed read-context contracts.",
		},
	]);
