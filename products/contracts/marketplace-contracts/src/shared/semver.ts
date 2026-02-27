import { z } from "zod";

export const semverPattern = /^\d+\.\d+\.\d+$/;

export const semverSchema = z.string().regex(semverPattern, {
	message: "Expected semver in MAJOR.MINOR.PATCH format.",
});
