import { cache } from "react";
import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Cached per-request — every server component on a given page can call
 * getCms() freely without re-initializing Payload multiple times per
 * render. This runs inside the Next.js server process (via @payloadcms/next's
 * config loading), which is the path already proven to work; it does not
 * go through Payload's standalone CLI bootstrapping.
 */
export const getCms = cache(async () => {
  return getPayload({ config });
});
