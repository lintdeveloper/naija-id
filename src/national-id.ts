import { type Result, err, ok } from "./result.js";

export interface NationalId {
  value: string;
}

const stripSpaces = (input: string): string => (input ?? "").replace(/\s/g, "");

function parseEleven(input: string, label: string): Result<NationalId> {
  const value = stripSpaces(input);
  if (!/^\d+$/.test(value)) return err("INVALID_FORMAT", `${label} must contain digits only`);
  if (value.length !== 11) return err("WRONG_LENGTH", `${label} must be exactly 11 digits`);
  return ok({ value });
}

/** NIN — 11 numeric digits (NIMC). Format only; real validity requires the NIMC API. */
export const parseNin = (input: string): Result<NationalId> => parseEleven(input, "NIN");

/** BVN — 11 numeric digits (CBN / NIBSS). Same shape as NIN; format only. */
export const parseBvn = (input: string): Result<NationalId> => parseEleven(input, "BVN");

export const isNin = (input: string): boolean => parseNin(input).valid;
export const isBvn = (input: string): boolean => parseBvn(input).valid;
