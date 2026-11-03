import { KernelError, type ErrorCode } from "./errors.js";

export function ensure(
  condition: unknown,
  code: ErrorCode,
  message: string,
): asserts condition {
  if (!condition) throw new KernelError(code, message);
}
