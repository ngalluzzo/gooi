import { BOLD, CYAN, DIM, GRN, R, RED, YEL } from "../../helpers";
import type { LocException, LocViolation } from "./config";

export function severityColor(excess: number, limit: number): string {
	if (excess > limit) return RED;
	if (excess > limit * 0.5) return YEL;
	return GRN;
}

export function severityLabel(excess: number, limit: number): string {
	if (excess > limit) return "critical";
	if (excess > limit * 0.5) return "warning ";
	return "ok+     ";
}

export function exceptionAllowanceText(exception: LocException): string {
	if (exception.maxLoc !== undefined) {
		return `${exception.maxLoc} loc`;
	}
	if (exception.maxExcess !== undefined) {
		return `${exception.maxExcess} excess`;
	}
	return "configured";
}

export function printViolations(
	regressions: readonly LocViolation[],
	limit: number,
	sortBy: string,
): void {
	const locW = 6;
	const exW = 6;
	const pathW = Math.max(...regressions.map((v) => v.path.length), 10);
	const hr = `${DIM}${"─".repeat(pathW + locW + exW + 28)}${R}`;

	console.log();
	console.log(
		`${BOLD}${RED}Files exceeding ${limit} loc${R}  ${DIM}(${regressions.length} violation${regressions.length === 1 ? "" : "s"}, sorted by ${sortBy})${R}`,
	);
	console.log(hr);
	console.log(
		`  ${BOLD}${"loc".padStart(locW)}  ${"excess".padStart(exW)}  severity  ${CYAN}file${R}`,
	);
	console.log(hr);

	for (const { path, loc, excess } of regressions) {
		const col = severityColor(excess, limit);
		console.log(
			`  ${col}${BOLD}${String(loc).padStart(locW)}${R}` +
				`  ${DIM}+${String(excess).padStart(exW - 1)}${R}` +
				`  ${col}${severityLabel(excess, limit)}${R}` +
				`  ${path}`,
		);
	}

	console.log(hr);
}

export function printSummary(
	regressions: readonly LocViolation[],
	_limit: number,
	hasCriticalExceptions: boolean,
): void {
	const avg = Math.round(
		regressions.reduce((s, v) => s + v.loc, 0) / regressions.length,
	);
	const worst = regressions[0];
	const totEx = regressions.reduce((s, v) => s + v.excess, 0);

	console.log();
	console.log(
		`  ${BOLD}Worst offender:${R}  ${worst?.path} ${RED}(${worst?.loc} loc)${R}`,
	);
	console.log(`  ${BOLD}Avg loc:${R}         ${avg}`);
	console.log(`  ${BOLD}Total excess:${R}    ${totEx} loc across violations`);
	console.log();

	if (hasCriticalExceptions) {
		console.log(
			`${YEL}${BOLD}⚠ LOC policy passed with exceptions${R}: all critical findings are exempted.`,
		);
	}
}

export function printCriticalExceptions(
	exceptions: ReadonlyArray<{
		violation: LocViolation;
		exception: LocException;
	}>,
): void {
	if (exceptions.length === 0) {
		return;
	}
	console.log(
		`${YEL}${BOLD}⚠ Critical findings exempted by exceptions:${R} ${exceptions.length}`,
	);
	for (const { violation, exception } of exceptions) {
		console.log(
			`  ${violation.path} ${DIM}(allowance: ${exceptionAllowanceText(exception)})${R}`,
		);
		if (exception.reason) {
			console.log(`    ${DIM}${exception.reason}${R}`);
		}
	}
	console.log();
}

export function printEmpty(
	regressions: readonly LocViolation[],
	limit: number,
): void {
	console.log();
	if (regressions.length === 0) {
		console.log(
			`${GRN}${BOLD}✓ No violations${R} — all files are under ${limit} loc`,
		);
		console.log();
		process.exit(0);
	}
	const frozenDebt = regressions.length;
	console.log(
		`${GRN}${BOLD}✓ ${frozenDebt} violation${frozenDebt === 1 ? "" : "s"} under limit.${R}`,
	);
	console.log();
}

export function printFailureOnCritical(): never {
	console.log(
		`${RED}${BOLD}❗ LOC policy gate failed${R} — critical findings detected (excess > limit loc).`,
	);
	process.exit(1);
}
