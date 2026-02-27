import type { CompiledFromCollectionProjectionPlan } from "@gooi/projection-contracts/plans/projection-plan";
import { projectionGuard } from "./guard-definitions.fixture";

export const projectionPlan: CompiledFromCollectionProjectionPlan = {
	projectionId: "messages_with_authors",
	strategy: "from_collection",
	sourceRef: {
		projectionId: "messages_with_authors",
		path: "domain.projections.messages_with_authors",
		strategy: "from_collection",
	},
	collectionId: "hello_messages",
	fields: [{ source: "id", as: "id" }],
	sort: [{ field: "id", direction: "asc" }],
	pagination: {
		mode: "page",
		pageArg: "page",
		pageSizeArg: "page_size",
		defaultPage: 1,
		defaultPageSize: 10,
		maxPageSize: 50,
	},
	guard: projectionGuard,
};
