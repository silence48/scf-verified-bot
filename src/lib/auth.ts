import NextAuth, { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";
import type { DiscordProfile } from "next-auth/providers/discord";
import "next-auth/jwt";

/**
 * We'll define a minimal user shape that includes 'id' (Discord ID)
 * plus optional fields for name, email, etc.
 * We'll also include `emailVerified`? to match the AdapterUser shape.
 */
export interface DiscordUser {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  discriminator?: string;
  emailVerified: Date | null; // <-- we add this so TS doesn't complain
}

const authConfig: NextAuthConfig = {

  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID ?? "",
      clientSecret: process.env.AUTH_DISCORD_SECRET ?? "",
      // We define a custom profile callback to ensure we have "id" as a string
      profile(profile: DiscordProfile) {
        // Return an object that has the shape of our DiscordUser
        return {
          id: profile.id,
          name: profile.username,
          email: profile.email ?? "",
          image: profile.image_url,
          discriminator: profile.discriminator,
          // For "emailVerified", we can just default to null if we like:
          emailVerified: profile.email_verified ?? null,
        } satisfies DiscordUser;
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET ?? "",
  trustHost: true,

  callbacks: {
    /**
     * Runs whenever a new JWT is created or updated (on sign in, etc.).
     * "user" can be the one returned from the "profile" callback
     * which is shaped like our DiscordUser.
     */
    jwt({ token, user }) {
      if (user) {
        // user is typed as `User | AdapterUser`, but we know from above it's shaped like our DiscordUser
        const discordUser = user as DiscordUser;
        token.user = {
          id: discordUser.id,
          name: discordUser.name,
          email: discordUser.email ?? "",
          image: discordUser.image,
          discriminator: discordUser.discriminator,
          emailVerified: discordUser.emailVerified ?? null,
        };
      }
      return token;
    },

    /**
     * Session callback merges `token.user` into `session.user`.
     */
    session({ session, token }) {
      if (token.user) {
        // "session.user" might be typed as an AdapterUser, which requires "emailVerified."
        // By including it in our custom user type, there's no conflict now.
        session.user = token.user;
      }
      return session;
    },
  },
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

/**
 * Module augmentation: We tell NextAuth that our 'Session.user' and 'JWT.user'
 * have the shape `DiscordUser`.
 */
declare module "next-auth" {
  interface Session {
    user: DiscordUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: DiscordUser;
  }
}
