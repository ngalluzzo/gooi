/**
 * Canonical refresh subscription map keyed by query id.
 */
export type ProjectionRefreshSubscriptions = Readonly<
	Record<
		string,
		{
			readonly queryId: string;
			readonly signalIds: readonly string[];
		}
	>
>;

/**
 * Resolves affected query ids from emitted signals deterministically.
 */
export const resolveProjectionRefreshImpact = (
	subscriptions: ProjectionRefreshSubscriptions,
	emittedSignalIds: readonly string[],
): readonly string[] => {
	const observed = new Set(emittedSignalIds);
	return Object.entries(subscriptions)
		.filter(([, subscription]) =>
			subscription.signalIds.some((signalId) => observed.has(signalId)),
		)
		.map(([, subscription]) => subscription.queryId)
		.sort((left, right) => left.localeCompare(right));
};
