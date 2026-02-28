import type {
	AuthoringEntrypointSpec as CanonicalAuthoringEntrypointSpec,
	GooiAppSpec as CanonicalGooiAppSpec,
} from "@gooi/app-spec-contracts/spec";
import { specContracts } from "@gooi/app-spec-contracts/spec";

export type AuthoringEntrypointSpec = CanonicalAuthoringEntrypointSpec;
export type GooiAppSpec = CanonicalGooiAppSpec;

export const authoringEntrypointSpecSchema =
	specContracts.authoringEntrypointSpecSchema;
export const gooiAppSpecCompatibilityPolicy =
	specContracts.gooiAppSpecCompatibilityPolicy;
export const gooiAppSpecSchema = specContracts.gooiAppSpecSchema;
export const gooiAppSpecVersionSchema = specContracts.gooiAppSpecVersionSchema;
export const parseAuthoringEntrypointSpec =
	specContracts.parseAuthoringEntrypointSpec;
export const parseGooiAppSpec = specContracts.parseGooiAppSpec;
