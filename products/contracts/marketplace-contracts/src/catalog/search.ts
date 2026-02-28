import { sortListings } from "../listing/state";
import { resolveCatalogProviderExecutionDescriptor } from "./descriptor";
import { createCatalogError } from "./errors";
import { type CatalogSearchResult, catalogSearchInputSchema } from "./model";

const includesQueryText = (
	value: {
		providerId: string;
		metadata: {
			displayName: string;
			summary?: string | undefined;
			tags: readonly string[];
		};
	},
	queryText: string | undefined,
): boolean => {
	if (queryText === undefined) {
		return true;
	}
	const normalizedQuery = queryText.toLocaleLowerCase();
	return (
		value.providerId.toLocaleLowerCase().includes(normalizedQuery) ||
		value.metadata.displayName.toLocaleLowerCase().includes(normalizedQuery) ||
		(value.metadata.summary?.toLocaleLowerCase().includes(normalizedQuery) ??
			false) ||
		value.metadata.tags.some((tag) =>
			tag.toLocaleLowerCase().includes(normalizedQuery),
		)
	);
};

export const searchCatalog = (value: unknown): CatalogSearchResult => {
	const parsedInput = catalogSearchInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createCatalogError(
				"catalog_schema_error",
				"Catalog search input failed schema validation.",
				parsedInput.error.issues,
			),
		};
	}

	const { state, descriptorIndex, query } = parsedInput.data;
	const filtered = sortListings(state.listings).filter((listing) => {
		if (
			query.providerNamespace !== undefined &&
			listing.providerNamespace !== query.providerNamespace
		) {
			return false;
		}
		if (
			query.providerIdPrefix !== undefined &&
			!listing.providerId.startsWith(query.providerIdPrefix)
		) {
			return false;
		}
		if (query.status !== undefined && listing.status !== query.status) {
			return false;
		}
		return includesQueryText(listing, query.text);
	});

	return {
		ok: true,
		result: {
			query,
			total: filtered.length,
			items: filtered
				.slice(query.offset, query.offset + query.limit)
				.map((listing) => ({
					...listing,
					executionDescriptor: resolveCatalogProviderExecutionDescriptor(
						listing.providerId,
						listing.providerVersion,
						descriptorIndex,
					),
				})),
		},
	};
};
