/** Cookie names shared by middleware (edge) and client auth helpers. */

export const USER_TOKEN_COOKIE = "zizkadb_token";
export const ADMIN_TOKEN_COOKIE = "zizkadb_admin_token";

/** Match JWT access token TTL (7 days). */
export const TOKEN_MAX_AGE_SEC = 60 * 60 * 24 * 7;
