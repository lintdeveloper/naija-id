import { type CacValue, parseCac } from "./cac.js";
import { type DriverLicense, parseDriverLicense } from "./driver-license.js";
import { type NationalId, parseBvn, parseNin } from "./national-id.js";
import { type Nuban, parseNuban } from "./nuban.js";
import { type Passport, parsePassport } from "./passport.js";
import { type NgPhone, parsePhone } from "./phone.js";
import { type Plate, parsePlate } from "./plate.js";
import type { Result } from "./result.js";
import { type RsaPin, parseRsaPin } from "./rsa-pin.js";
import type { StandardSchemaV1 } from "./standard-schema.js";
import { type TinValue, parseTin } from "./tin.js";

/**
 * Standard Schema factories for Nigerian identifiers (subpath: `naija-id/standard`).
 *
 * Zero runtime dependencies. Each schema validates the string format and, on success, outputs the
 * parsed/normalized value. Use anywhere Standard Schema is accepted — React Hook Form, tRPC,
 * TanStack Form — or alongside Zod v4 / Valibot / ArkType.
 */
const schema = <T>(parse: (input: string) => Result<T>): StandardSchemaV1<string, T> => ({
  "~standard": {
    version: 1,
    vendor: "naija-id",
    validate(value: unknown) {
      if (typeof value !== "string") {
        return { issues: [{ message: "Expected a string" }] };
      }
      const result = parse(value);
      return result.valid
        ? { value: result.value }
        : { issues: [{ message: result.error.message }] };
    },
  },
});

export const ngPhone = (): StandardSchemaV1<string, NgPhone> => schema(parsePhone);
export const nin = (): StandardSchemaV1<string, NationalId> => schema(parseNin);
export const bvn = (): StandardSchemaV1<string, NationalId> => schema(parseBvn);
export const cac = (): StandardSchemaV1<string, CacValue> => schema(parseCac);
export const tin = (): StandardSchemaV1<string, TinValue> => schema(parseTin);
export const plate = (): StandardSchemaV1<string, Plate> => schema(parsePlate);
export const passport = (): StandardSchemaV1<string, Passport> => schema(parsePassport);
export const driverLicense = (): StandardSchemaV1<string, DriverLicense> =>
  schema(parseDriverLicense);
export const rsaPin = (): StandardSchemaV1<string, RsaPin> => schema(parseRsaPin);
export const nuban = (bankCode: string): StandardSchemaV1<string, Nuban> =>
  schema((value) => parseNuban(value, bankCode));

export type { StandardSchemaV1 } from "./standard-schema.js";
