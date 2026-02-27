/**
 * Minimal read provider contract used by projection runtime strategies.
 */
export interface ProjectionCollectionReaderPort {
	/**
	 * Returns all rows for one collection snapshot.
	 * Strategy executors apply deterministic filtering/sorting/pagination.
	 */
	readonly scanCollection: (input: {
		readonly collectionId: string;
	}) => Promise<readonly Readonly<Record<string, unknown>>[]>;
}
