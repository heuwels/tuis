import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { googleCalendarSettings } from "@/lib/db/schema";

const { handlers } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account && profile?.email) {
        // Store tokens in database (single household connection - replace any existing)
        await db.delete(googleCalendarSettings);
        await db.insert(googleCalendarSettings).values({
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          tokenExpiry: new Date(account.expires_at! * 1000).toISOString(),
          connectedEmail: profile.email,
          syncEnabled: true,
        });
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session }) {
      // Fetch connection status from database
      const settings = await db
        .select()
        .from(googleCalendarSettings)
        .limit(1);
      (session as typeof session & { googleConnected?: boolean; connectedEmail?: string }).googleConnected = settings.length > 0;
      (session as typeof session & { connectedEmail?: string }).connectedEmail = settings[0]?.connectedEmail;
      return session;
    },
  },
});

export const { GET, POST } = handlers;
