import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers";
import { createContext } from "./context";
import { auth } from "./auth";
import type { Env } from "./db";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.use("/api/*", cors({
  origin: "*",
  credentials: true,
}));

// Auth routes
app.route("/api/auth", auth);

// tRPC handler
app.all("/api/trpc/*", async (c) => {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: (opts) => createContext(opts, c.env),
  });
  return response;
});

export default app;
