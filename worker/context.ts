import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { User } from "../drizzle/schema-d1";
import { getDb, getUserByOpenId, type Env } from "./db";
import { jwtVerify } from "jose";

const COOKIE_NAME = "session";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  db: DrizzleD1Database;
  env: Env;
  user: User | null;
};

function getCookieValue(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(";").map(c => c.trim());
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split("=");
    if (key.trim() === name) return rest.join("=");
  }
  return undefined;
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
  env: Env
): Promise<TrpcContext> {
  const db = getDb(env);
  let user: User | null = null;

  try {
    const token = getCookieValue(opts.req, COOKIE_NAME);
    if (token) {
      const secret = new TextEncoder().encode(env.JWT_SECRET || "taskflow-secret-key-2024");
      const { payload } = await jwtVerify(token, secret);
      if (payload.openId && typeof payload.openId === "string") {
        const dbUser = await getUserByOpenId(db, payload.openId);
        user = dbUser ?? null;
      }
    }
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
    db,
    env,
    user,
  };
}
