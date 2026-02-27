import { type DeploymentLockfile, deploymentLockfileSchema } from "./contracts";

/**
 * Validates and parses a deployment lockfile artifact.
 *
 * @param value - Untrusted lockfile input.
 * @returns Parsed lockfile.
 *
 * @example
 * const lockfile = parseDeploymentLockfile(rawLockfile);
 */
export const parseDeploymentLockfile = (value: unknown): DeploymentLockfile =>
	deploymentLockfileSchema.parse(value);
