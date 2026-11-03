export type ErrorCode =
  | "invalid-value"
  | "invalid-envelope"
  | "identity-mismatch"
  | "boundary-mismatch"
  | "contract-mismatch"
  | "limit-exceeded";
export class KernelError extends Error {
  override readonly name = "KernelError";
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
