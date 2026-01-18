import type { Adapter, AdapterUser, AdapterAccount, AdapterSession } from "next-auth/adapters"
import { eq, and } from "drizzle-orm"
import { drizzle } from "drizzle-orm/d1"
import * as schema from "@/lib/db/schema"

function generateId() {
  return crypto.randomUUID()
}

export function D1Adapter(d1: D1Database): Adapter {
  const db = drizzle(d1, { schema })

  return {
    async createUser(user) {
      const id = generateId()
      await db.insert(schema.users).values({
        id,
        email: user.email,
        name: user.name ?? null,
        emailVerified: user.emailVerified?.toISOString() ?? null,
        image: user.image ?? null,
      })
      return {
        id,
        email: user.email,
        name: user.name ?? null,
        emailVerified: user.emailVerified ?? null,
        image: user.image ?? null,
      }
    },

    async getUser(id) {
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .get()
      if (!result) return null
      return {
        id: result.id,
        email: result.email,
        name: result.name,
        emailVerified: result.emailVerified ? new Date(result.emailVerified) : null,
        image: result.image,
      }
    },

    async getUserByEmail(email) {
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .get()
      if (!result) return null
      return {
        id: result.id,
        email: result.email,
        name: result.name,
        emailVerified: result.emailVerified ? new Date(result.emailVerified) : null,
        image: result.image,
      }
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const account = await db
        .select()
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.providerAccountId, providerAccountId),
            eq(schema.accounts.provider, provider)
          )
        )
        .get()
      if (!account) return null

      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, account.userId))
        .get()
      if (!user) return null

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
        image: user.image,
      }
    },

    async updateUser(user) {
      if (!user.id) throw new Error("User id is required")
      await db
        .update(schema.users)
        .set({
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          emailVerified: user.emailVerified?.toISOString() ?? undefined,
          image: user.image ?? undefined,
        })
        .where(eq(schema.users.id, user.id))
      const result = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .get()
      if (!result) throw new Error("User not found")
      return {
        id: result.id,
        email: result.email,
        name: result.name,
        emailVerified: result.emailVerified ? new Date(result.emailVerified) : null,
        image: result.image,
      }
    },

    async deleteUser(userId) {
      await db.delete(schema.users).where(eq(schema.users.id, userId))
    },

    async linkAccount(account) {
      await db.insert(schema.accounts).values({
        id: generateId(),
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token ?? null,
        access_token: account.access_token ?? null,
        expires_at: account.expires_at ?? null,
        token_type: account.token_type ?? null,
        scope: account.scope ?? null,
        id_token: account.id_token ?? null,
        session_state: account.session_state as string ?? null,
      })
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await db
        .delete(schema.accounts)
        .where(
          and(
            eq(schema.accounts.providerAccountId, providerAccountId),
            eq(schema.accounts.provider, provider)
          )
        )
    },

    async createSession({ sessionToken, userId, expires }) {
      await db.insert(schema.sessions).values({
        id: generateId(),
        sessionToken,
        userId,
        expires: expires.toISOString(),
      })
      return { sessionToken, userId, expires }
    },

    async getSessionAndUser(sessionToken) {
      const session = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.sessionToken, sessionToken))
        .get()
      if (!session) return null

      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, session.userId))
        .get()
      if (!user) return null

      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: new Date(session.expires),
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
          image: user.image,
        },
      }
    },

    async updateSession({ sessionToken, expires, userId }) {
      await db
        .update(schema.sessions)
        .set({
          expires: expires?.toISOString(),
          userId: userId,
        })
        .where(eq(schema.sessions.sessionToken, sessionToken))
      const result = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.sessionToken, sessionToken))
        .get()
      if (!result) return null
      return {
        sessionToken: result.sessionToken,
        userId: result.userId,
        expires: new Date(result.expires),
      }
    },

    async deleteSession(sessionToken) {
      await db
        .delete(schema.sessions)
        .where(eq(schema.sessions.sessionToken, sessionToken))
    },

    async createVerificationToken({ identifier, expires, token }) {
      await db.insert(schema.verificationTokens).values({
        identifier,
        token,
        expires: expires.toISOString(),
      })
      return { identifier, expires, token }
    },

    async useVerificationToken({ identifier, token }) {
      const result = await db
        .select()
        .from(schema.verificationTokens)
        .where(
          and(
            eq(schema.verificationTokens.identifier, identifier),
            eq(schema.verificationTokens.token, token)
          )
        )
        .get()
      if (!result) return null

      await db
        .delete(schema.verificationTokens)
        .where(
          and(
            eq(schema.verificationTokens.identifier, identifier),
            eq(schema.verificationTokens.token, token)
          )
        )

      return {
        identifier: result.identifier,
        token: result.token,
        expires: new Date(result.expires),
      }
    },
  }
}
