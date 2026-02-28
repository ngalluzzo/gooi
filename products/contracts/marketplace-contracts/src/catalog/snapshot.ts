import { sortListings } from "../listing/state";
import { createCatalogError } from "./errors";
import { hashCatalogValue } from "./hash";
import {
	type CatalogSnapshotResult,
	catalogSnapshotExportInputSchema,
} from "./model";

const toSourceAuditSequence = (
	auditLog: readonly { sequence: number }[],
): number => auditLog.at(-1)?.sequence ?? 0;

export const exportCatalogSnapshot = (
	value: unknown,
): CatalogSnapshotResult => {
	const parsedInput = catalogSnapshotExportInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createCatalogError(
				"catalog_schema_error",
				"Catalog snapshot export input failed schema validation.",
				parsedInput.error.issues,
			),
		};
	}

	const { state, mirrorId, exportVersion, includeDeprecated } =
		parsedInput.data;
	const listings = sortListings(state.listings).filter((listing) => {
		return includeDeprecated || listing.status === "active";
	});
	const snapshotValue = {
		exportVersion,
		listings,
		sourceAuditSequence: toSourceAuditSequence(state.auditLog),
	};
	const snapshotHash = hashCatalogValue(snapshotValue);
	return {
		ok: true,
		snapshot: {
			snapshotHash,
			snapshotId: `${mirrorId}:${snapshotHash}`,
			mirrorId,
			mirrorPath: `snapshots/${mirrorId}/${snapshotHash}.json`,
			exportVersion,
			sourceAuditSequence: snapshotValue.sourceAuditSequence,
			listingCount: listings.length,
			listings,
		},
	};
};
