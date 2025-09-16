import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session }) {
      return session;
    },
  },
};
/**
 * Wrapper to get the server session using NextAuth v4 in App Router.
 */
export const auth = () => getServerSession(authOptions);


