const isoTimestampPattern =
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;

const floorDiv = (value: number, divisor: number): number => {
	if (value >= 0) {
		return Math.floor(value / divisor);
	}
	return -Math.floor((-value + divisor - 1) / divisor);
};

const daysFromCivil = (year: number, month: number, day: number): number => {
	const adjustedYear = month <= 2 ? year - 1 : year;
	const era = floorDiv(adjustedYear, 400);
	const yearOfEra = adjustedYear - era * 400;
	const monthPrime = month > 2 ? month - 3 : month + 9;
	const dayOfYear = Math.floor((153 * monthPrime + 2) / 5) + day - 1;
	const dayOfEra =
		yearOfEra * 365 +
		Math.floor(yearOfEra / 4) -
		Math.floor(yearOfEra / 100) +
		dayOfYear;
	return era * 146097 + dayOfEra - 719468;
};

const toOffsetMinutes = (offsetText: string): number => {
	if (offsetText === "Z") {
		return 0;
	}
	const sign = offsetText.startsWith("-") ? -1 : 1;
	const hours = Number(offsetText.slice(1, 3));
	const minutes = Number(offsetText.slice(4, 6));
	return sign * (hours * 60 + minutes);
};

const parseIsoToEpochMs = (value: string): number | null => {
	const matched = value.match(isoTimestampPattern);
	if (matched === null) {
		return null;
	}

	const [
		,
		yearText,
		monthText,
		dayText,
		hourText,
		minuteText,
		secondText,
		fractionalText,
		offsetText,
	] = matched;

	if (
		yearText === undefined ||
		monthText === undefined ||
		dayText === undefined ||
		hourText === undefined ||
		minuteText === undefined ||
		secondText === undefined ||
		offsetText === undefined
	) {
		return null;
	}

	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	const hour = Number(hourText);
	const minute = Number(minuteText);
	const second = Number(secondText);
	const fractionalRaw = fractionalText ?? "";
	const millisecond = Number(`${fractionalRaw}000`.slice(0, 3) || "0");

	if (
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31 ||
		hour > 23 ||
		minute > 59 ||
		second > 59 ||
		millisecond > 999
	) {
		return null;
	}

	const days = daysFromCivil(year, month, day);
	const utcMillis =
		days * 86_400_000 +
		hour * 3_600_000 +
		minute * 60_000 +
		second * 1_000 +
		millisecond;

	const offsetMinutes = toOffsetMinutes(offsetText);
	return utcMillis - offsetMinutes * 60_000;
};

/**
 * Calculates duration milliseconds for two ISO-8601 timestamps.
 *
 * Returns `0` when either timestamp is unparseable or negative duration.
 */
export const calculateIsoDurationMs = (
	startedAt: string,
	completedAt: string,
): number => {
	const startedAtMs = parseIsoToEpochMs(startedAt);
	const completedAtMs = parseIsoToEpochMs(completedAt);
	if (startedAtMs === null || completedAtMs === null) {
		return 0;
	}
	return Math.max(0, completedAtMs - startedAtMs);
};
