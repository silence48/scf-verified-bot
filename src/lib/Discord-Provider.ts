/**
 * A minimal, self-contained Discord OAuth provider
 */
export interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  mfa_enabled: boolean;
  banner: string | null;
  accent_color: number | null;
  locale: string;
  verified: boolean;
  email: string | null;
  flags: number;
  premium_type: number;
  public_flags: number;
  display_name: string | null;
  avatar_decoration: string | null;
  banner_color: string | null;
  /**
   * We add this field to store the final image URL. You won't get
   * this directly from Discord's profile endpoint, but we'll derive it.
   */
  image_url?: string;
}

/**
 * Minimal shape for NextAuth OAuth “user config”.
 * This is what you’d pass to the provider function, e.g.
 * `clientId`, `clientSecret`, `checks`, etc.
 */
export interface DiscordProviderOptions {
  clientId: string;
  clientSecret: string;
  /** NextAuth v5 supports PKCE, state, nonce, or none. Default is usually `["state"]`. */
  checks?: Array<"pkce" | "state" | "nonce" | "none">;
  /** Optionally customize the OAuth scopes, override default, etc. */
  scope?: string;
}

/**
 * The minimal shape NextAuth expects for a single OAuth provider.
 * We only implement the fields we care about for Discord.
 */
export interface DiscordOAuthConfig<P> {
  /** Unique string ID for the provider (used internally and in routes). */
  id: string;
  /** Display name for the provider. Appears in default sign-in pages. */
  name: string;
  /** Must be `"oauth"` for an OAuth 2 provider in NextAuth. */
  type: "oauth";
  /** Where the user is sent to log in. */
  authorization: {
    url: string;
    params: Record<string, string>;
  };
  /** The URL NextAuth calls to exchange the code for tokens. */
  token: string;
  /** The URL NextAuth calls to fetch user profile data. */
  userinfo: string;
  /**
   * A function that maps the returned profile into
   * the user object you want NextAuth to store.
   */
  profile(profile: P): {
    id: string;
    name: string | null;
    email?: string | null;
    image?: string | null;
  };
  /**
   * We store the user’s own configuration so NextAuth
   * can merge/override defaults as needed (optional).
   */
  options: DiscordProviderOptions;
}

/**
 * A strictly typed Discord Provider for NextAuth v5.
 * It returns a shape that NextAuth can interpret as an OAuth provider,
 * but with no `any` types in the core fields.
 */
export default function DiscordProvider(options: DiscordProviderOptions): DiscordOAuthConfig<DiscordProfile> {
  return {
    id: "discord",
    name: "Discord",
    type: "oauth",
    authorization: {
      url: "https://discord.com/api/oauth2/authorize",
      params: {
        // By default, we’ll request identify + email.
        scope: options.scope ?? "identify email",
      },
    },
    token: "https://discord.com/api/oauth2/token",
    userinfo: "https://discord.com/api/users/@me",

    /**
     * Map Discord’s profile into the user object
     * that NextAuth will store in `user`.
     */
    profile(profile) {
      // Derive an avatar if missing:
      if (!profile.avatar) {
        // If the user’s avatar is null, use a “default avatar”.
        const defaultAvatarNumber = profile.discriminator === "0" ? Number(BigInt(profile.id) >> BigInt(22)) % 6 : parseInt(profile.discriminator) % 5;
        profile.image_url = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
      } else {
        // If we have a user avatar, figure out its format (png vs gif).
        const format = profile.avatar.startsWith("a_") ? "gif" : "png";
        profile.image_url = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${format}`;
      }

      return {
        id: profile.id,
        name: profile.global_name ?? profile.username,
        email: profile.email ?? undefined,
        image: profile.image_url ?? undefined,
      };
    },

    options,
  };
}
