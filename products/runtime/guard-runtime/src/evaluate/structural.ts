import type {
	CompiledStructuralGuardDefinition,
	GuardOperand,
} from "@gooi/guard-contracts/plans";
import { stableStringify } from "@gooi/stable-json";
import { readPathValue } from "../shared/path";

const resolveOperand = (
	context: Readonly<Record<string, unknown>>,
	operand: GuardOperand,
): unknown => {
	if (operand.kind === "literal") {
		return operand.value;
	}
	return readPathValue(context, operand.path);
};

const compare = (left: unknown, right: unknown): number | null => {
	if (typeof left === "number" && typeof right === "number") {
		return left === right ? 0 : left < right ? -1 : 1;
	}
	if (typeof left === "string" && typeof right === "string") {
		return left.localeCompare(right);
	}
	if (left instanceof Date && right instanceof Date) {
		const l = left.getTime();
		const r = right.getTime();
		return l === r ? 0 : l < r ? -1 : 1;
	}
	return null;
};

const areEqual = (left: unknown, right: unknown): boolean => {
	if (Object.is(left, right)) {
		return true;
	}
	if (typeof left !== "object" || left === null) {
		return false;
	}
	if (typeof right !== "object" || right === null) {
		return false;
	}
	return stableStringify(left) === stableStringify(right);
};

export const evaluateStructuralRule = (
	context: Readonly<Record<string, unknown>>,
	rule: CompiledStructuralGuardDefinition,
): boolean => {
	const left = resolveOperand(context, rule.left);
	if (rule.operator === "exists") {
		return left !== undefined && left !== null;
	}

	const right =
		rule.right === undefined ? undefined : resolveOperand(context, rule.right);
	if (rule.operator === "eq") {
		return areEqual(left, right);
	}
	if (rule.operator === "neq") {
		return !areEqual(left, right);
	}
	const compared = compare(left, right);
	if (compared === null) {
		return false;
	}
	if (rule.operator === "gt") {
		return compared > 0;
	}
	if (rule.operator === "gte") {
		return compared >= 0;
	}
	if (rule.operator === "lt") {
		return compared < 0;
	}
	return compared <= 0;
};
