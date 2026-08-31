import { cookies, headers } from "next/headers";

export const ACCESS_KEY_COOKIE = "easy_invoice_access_key";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * Access keys stand in for accounts: they are the only thing tying stored
 * invoices to a person, so the format is fixed and strictly validated before
 * it ever reaches Redis as part of a key.
 *
 * 32 hex characters is 128 bits of entropy, which is not enumerable.
 */
const ACCESS_KEY_PATTERN = /^inv_[0-9a-f]{32}$/;

export function isValidAccessKey(key: unknown): key is string {
  return typeof key === "string" && ACCESS_KEY_PATTERN.test(key);
}

export function generateAccessKey() {
  return `inv_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function readAccessKey() {
  const value = cookies().get(ACCESS_KEY_COOKIE)?.value;

  return isValidAccessKey(value) ? value : null;
}

/**
 * Only callable from a server action or route handler - Next.js does not allow
 * setting cookies while rendering.
 */
export function writeAccessKey(key: string) {
  // Keyed to the actual request protocol rather than NODE_ENV: behind the
  // deployment proxy this is https, while a plain-HTTP host (or localhost)
  // would silently drop a Secure cookie and lose every saved invoice.
  const forwardedProto = headers().get("x-forwarded-proto");
  const isHttps = forwardedProto?.split(",")[0]?.trim() === "https";

  cookies().set({
    name: ACCESS_KEY_COOKIE,
    value: key,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: ONE_YEAR_IN_SECONDS,
  });
}

export function clearAccessKey() {
  cookies().delete(ACCESS_KEY_COOKIE);
}
