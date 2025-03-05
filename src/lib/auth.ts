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
          discordId: profile.id,
          ...profile
        };
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
        // User is coming from the Discord OAuth profile
        token.user = user as  DiscordProfile & {
          discordId: string;
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
        session.user = {
          ...token.user,
          discordId: token.user.discordId,
          email: token.user.email ?? "",
          emailVerified: token.user.verified ? new Date(Date.now()) : null,
          };
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
    user: DiscordProfile & {
      discordId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: DiscordProfile & {
      discordId: string;
    };
    
  }
}
