/** Minimal placeholder for "async or sync" return values. */
export type Awaitable<T> = T | PromiseLike<T>;

/** Minimal user object shape that NextAuth (or you) might store. */
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/** Minimal shape for tokens an OAuth provider might return. */
export interface TokenSet {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  id_token?: string;
  token_type?: string;
  scope?: string;
  // Feel free to add others as needed (e.g. 'expires_in', etc.)
}

/**
 * Callback that transforms the raw OAuth profile + tokens
 * into the `User` object shape you want NextAuth to store.
 */
export type ProfileCallback<Profile> = (
  profile: Profile,
  tokens: TokenSet
) => Awaitable<User>;

/**
 * Minimal set of shared provider options (id, name, etc.).
 * `type: "oauth"` ensures NextAuth recognizes this is an OAuth2 flow.
 */
export interface CommonProviderOptions {
  id: string;
  name: string;
  type: "oauth" | "oidc"; // typically "oauth" or "oidc"
}

/**
 * A minimal, strictly typed OAuth2 config that NextAuth can consume.
 * It includes only the essential fields, no `any` usage.
 */
export interface OAuth2Config<Profile> extends CommonProviderOptions {
  /** The authorization endpoint details. */
  authorization: {
    url: string;
    params: Record<string, string>;
  };
  /** The token endpoint URL (for code exchange). */
  token: string;
  /** The user info endpoint URL (to fetch profile data). */
  userinfo: string;

  /**
   * The callback that transforms the raw provider profile + tokens
   * into a simple `User` object for NextAuth to store.
   */
  profile: ProfileCallback<Profile>;

  /**
   * PKCE, state, or nonce checks.
   * If you add `redirectProxyUrl`, NextAuth will automatically enable `state`.
   */
  checks?: Array<"pkce" | "state" | "nonce" | "none">;

  /** Usually your OAuth client ID. */
  clientId: string;
  /** Usually your OAuth client secret. */
  clientSecret: string;
}

/**
 * The shape for "user config" you would pass
 * to the provider function (e.g., your `clientId`, `clientSecret`, etc.).
 */
export interface OAuthUserConfig<Profile> {
  /** Your OAuth client ID. */
  clientId: string;
  /** Your OAuth client secret. */
  clientSecret: string;
  /** Which checks to enable, e.g. `["state"]`. */
  checks?: Array<"pkce" | "state" | "nonce" | "none">;
  /**
   * If you want more or fewer scopes from the provider,
   * put them here. e.g. `"identify email guilds"`.
   */
  scope?: string;
}
