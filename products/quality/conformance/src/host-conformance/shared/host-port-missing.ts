export const hasMissingHostPortDiagnostic = (
	details: unknown,
	expectedPath: string,
): boolean => {
	if (details === null || typeof details !== "object") {
		return false;
	}
	const detailsRecord = details as Readonly<Record<string, unknown>>;
	if (detailsRecord.code !== "host_port_missing") {
		return false;
	}
	if (!Array.isArray(detailsRecord.missingHostPortMembers)) {
		return false;
	}
	return detailsRecord.missingHostPortMembers.some((member) => {
		if (member === null || typeof member !== "object") {
			return false;
		}
		const memberRecord = member as Readonly<Record<string, unknown>>;
		return memberRecord.path === expectedPath;
	});
};
