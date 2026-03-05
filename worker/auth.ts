import { Hono } from "hono";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { users, accessLogs } from "../drizzle/schema-d1";
import type { Env } from "./db";

type HonoEnv = { Bindings: Env };

const auth = new Hono<HonoEnv>();

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// POST /api/auth/login
auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    const db = drizzle(c.env.DB);
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (result.length === 0) {
      return c.json({ error: "Email ou senha incorretos" }, 401);
    }

    const user = result[0];
    const passwordHash = await hashPassword(password);

    if (user.passwordHash !== passwordHash) {
      return c.json({ error: "Email ou senha incorretos" }, 401);
    }

    // Verificar se o usuário está ativo
    if (user.isActive === 0) {
      return c.json({ error: "Sua conta foi desativada. Entre em contato com o administrador." }, 403);
    }

    // Update lastSignedIn
    const now = new Date().toISOString();
    await db.update(users).set({ lastSignedIn: now }).where(eq(users.id, user.id));
    // Registrar log de acesso
    await db.insert(accessLogs).values({
      userId: user.id,
      userName: user.name,
      action: "login",
      ipAddress: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || null,
      userAgent: c.req.header("user-agent") || null,
      page: "/login",
    });

    // Create JWT
    const secret = new TextEncoder().encode(c.env.JWT_SECRET || "taskflow-secret-key-2024");
    const token = await new SignJWT({ openId: user.openId, userId: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("365d")
      .sign(secret);

    // Set cookie
    const cookie = `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;

    return c.json(
      { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      200,
      { "Set-Cookie": cookie }
    );
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return c.json({ error: "Erro interno no login" }, 500);
  }
});

// POST /api/auth/register
auth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return c.json({ error: "Nome, email e senha são obrigatórios" }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: "Senha deve ter no mínimo 6 caracteres" }, 400);
    }

    const db = drizzle(c.env.DB);

    // Check if email already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return c.json({ error: "Este email já está cadastrado" }, 409);
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const openId = `user-${crypto.randomUUID()}`;

    const result = await db.insert(users).values({
      openId,
      name,
      email,
      role: "user",
      passwordHash,
      totalPoints: 0,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    }).returning({ id: users.id });

    const userId = result[0].id;

    // Create JWT
    const secret = new TextEncoder().encode(c.env.JWT_SECRET || "taskflow-secret-key-2024");
    const token = await new SignJWT({ openId, userId })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("365d")
      .sign(secret);

    const cookie = `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;

    return c.json(
      { success: true, user: { id: userId, name, email, role: "user" } },
      201,
      { "Set-Cookie": cookie }
    );
  } catch (error) {
    console.error("[Auth] Register error:", error);
    return c.json({ error: "Erro interno no registro" }, 500);
  }
});

export { auth };
