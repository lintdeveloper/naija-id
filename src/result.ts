export type NaijaIdErrorCode = "INVALID_FORMAT" | "WRONG_LENGTH" | "UNKNOWN_PREFIX";

export interface NaijaIdError {
  code: NaijaIdErrorCode;
  message: string;
}

/** Discriminated result: narrow on `valid` to reach `value` or `error`. */
export type Result<T> = { valid: true; value: T } | { valid: false; error: NaijaIdError };

export const ok = <T>(value: T): Result<T> => ({ valid: true, value });

export const err = (code: NaijaIdErrorCode, message: string): Result<never> => ({
  valid: false,
  error: { code, message },
});
