import { z } from "zod";
import { isCac } from "./cac.js";
import { isBvn, isNin } from "./national-id.js";
import { isPhone } from "./phone.js";
import { isTin } from "./tin.js";

/**
 * Zod schemas for Nigerian identifiers (subpath: `naija-id/zod`). Requires `zod` as a peer
 * dependency. Each validates the string format — see the README note on format-vs-existence.
 * To normalize, pipe the value through the matching `format*`/`parse*` helper from `naija-id`.
 */
export const ngPhone = () => z.string().refine(isPhone, "Invalid Nigerian phone number");
export const nin = () => z.string().refine(isNin, "Invalid NIN — expected 11 digits");
export const bvn = () => z.string().refine(isBvn, "Invalid BVN — expected 11 digits");
export const cac = () => z.string().refine(isCac, "Invalid CAC registration number");
export const tin = () => z.string().refine(isTin, "Invalid TIN");
