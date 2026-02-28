const trimTrailingSlashes = (value: string): string => {
	let end = value.length;
	while (end > 0 && value.charCodeAt(end - 1) === 47) {
		end -= 1;
	}
	return value.slice(0, end);
};

const normalizeRequestPath = (value: string): string => {
	const trimmed = value.trim();
	if (trimmed === "/") {
		return "/";
	}
	const normalized = trimTrailingSlashes(trimmed);
	return normalized.length === 0 ? "/" : normalized;
};

export const matchPathTemplate = (
	template: string,
	actualPath: string,
): boolean => {
	const templateSegments = normalizeRequestPath(template)
		.split("/")
		.filter((segment) => segment.length > 0);
	const actualSegments = normalizeRequestPath(actualPath)
		.split("/")
		.filter((segment) => segment.length > 0);
	let templateIndex = 0;
	let actualIndex = 0;
	while (templateIndex < templateSegments.length) {
		const templateSegment = templateSegments[templateIndex];
		if (templateSegment === undefined) {
			return false;
		}
		if (templateSegment === "*") {
			return true;
		}
		const actualSegment = actualSegments[actualIndex];
		if (actualSegment === undefined) {
			return false;
		}
		if (!templateSegment.startsWith(":") && templateSegment !== actualSegment) {
			return false;
		}
		templateIndex += 1;
		actualIndex += 1;
	}
	return actualIndex === actualSegments.length;
};
