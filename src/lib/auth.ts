import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, ipFromHeaders } from "@/lib/rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const rawEmail = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!rawEmail || !password) return null;

        // Throttle repeated attempts per IP to slow brute-force / credential
        // stuffing. Over-limit fails closed as a generic auth error.
        const ip = ipFromHeaders((request as Request | undefined)?.headers ?? null);
        if (!rateLimit(`login:${ip}`, 10, 5 * 60_000)) return null;

        const email = rawEmail.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = compareSync(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
