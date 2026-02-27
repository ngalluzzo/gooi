import type {
	AuthoringEntrypointSpec as CanonicalAuthoringEntrypointSpec,
	GooiAppSpec as CanonicalGooiAppSpec,
} from "@gooi/app-spec-contracts/spec";
import {
	authoringEntrypointSpecSchema as canonicalAuthoringEntrypointSpecSchema,
	gooiAppSpecCompatibilityPolicy as canonicalGooiAppSpecCompatibilityPolicy,
	gooiAppSpecSchema as canonicalGooiAppSpecSchema,
	gooiAppSpecVersionSchema as canonicalGooiAppSpecVersionSchema,
	parseAuthoringEntrypointSpec as canonicalParseAuthoringEntrypointSpec,
	parseGooiAppSpec as canonicalParseGooiAppSpec,
} from "@gooi/app-spec-contracts/spec";

export type AuthoringEntrypointSpec = CanonicalAuthoringEntrypointSpec;
export type GooiAppSpec = CanonicalGooiAppSpec;

export const authoringEntrypointSpecSchema =
	canonicalAuthoringEntrypointSpecSchema;
export const gooiAppSpecCompatibilityPolicy =
	canonicalGooiAppSpecCompatibilityPolicy;
export const gooiAppSpecSchema = canonicalGooiAppSpecSchema;
export const gooiAppSpecVersionSchema = canonicalGooiAppSpecVersionSchema;
export const parseAuthoringEntrypointSpec =
	canonicalParseAuthoringEntrypointSpec;
export const parseGooiAppSpec = canonicalParseGooiAppSpec;
