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

// ===== OUVIDORIA PÚBLICA (sem login) =====
// Criar reclamação anônima externa
app.post("/api/public/complaint", async (c) => {
  try {
    const body = await c.req.json();
    const { type, category, subject, description, occurrenceDate, occurrenceLocation, authorName, authorEmail, authorPhone, isAnonymous } = body;

    if (!type || !category || !subject || !description) {
      return c.json({ error: 'Campos obrigatórios: type, category, subject, description' }, 400);
    }
    if (subject.length < 3 || description.length < 10) {
      return c.json({ error: 'Assunto mínimo 3 caracteres, descrição mínimo 10 caracteres' }, 400);
    }

    const { drizzle } = await import('drizzle-orm/d1');
    const db = drizzle(c.env.DB);
    const { generateProtocol, createComplaint, createNotification } = await import('./db');
    const { users } = await import('../drizzle/schema-d1');

    const protocol = await generateProtocol(db);
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null;

    const complaint = await createComplaint(db, {
      protocol,
      type,
      category,
      priority: 'media',
      subject,
      description,
      occurrenceDate: occurrenceDate || null,
      occurrenceLocation: occurrenceLocation || null,
      authorName: isAnonymous ? null : (authorName || null),
      authorEmail: isAnonymous ? null : (authorEmail || null),
      authorPhone: isAnonymous ? null : (authorPhone || null),
      isAnonymous: isAnonymous !== false,
      isExternal: true,
      ipAddress: ip,
    });

    // Notify all admins
    const admins = await db.select({ id: users.id, role: users.role }).from(users);
    for (const admin of admins.filter((u: any) => u.role === 'admin')) {
      await createNotification(db, {
        userId: admin.id,
        type: 'complaint_new',
        title: 'Nova reclamação externa na Ouvidoria',
        message: `Reclamação externa ${isAnonymous !== false ? 'anônima' : `de ${authorName || 'Não identificado'}`}: "${subject}" [${protocol}]`,
        entityType: 'complaint',
        entityId: complaint.id,
      });
    }

    return c.json({ success: true, protocol, message: `Seu registro foi criado com sucesso. Protocolo: ${protocol}` });
  } catch (error: any) {
    return c.json({ error: error.message || 'Erro interno' }, 500);
  }
});

// Consultar status por protocolo (público)
app.get("/api/public/complaint/:protocol", async (c) => {
  try {
    const protocol = c.req.param('protocol');
    const { drizzle } = await import('drizzle-orm/d1');
    const db = drizzle(c.env.DB);
    const { getComplaintByProtocol, getComplaintResponses } = await import('./db');

    const complaint = await getComplaintByProtocol(db, protocol);
    if (!complaint) {
      return c.json({ error: 'Protocolo não encontrado' }, 404);
    }

    const responses = await getComplaintResponses(db, complaint.id, false); // Only public responses

    const statusLabels: Record<string, string> = {
      novo: 'Novo', em_analise: 'Em Análise', em_andamento: 'Em Andamento',
      respondido: 'Respondido', concluido: 'Concluído', arquivado: 'Arquivado',
    };

    return c.json({
      protocol: complaint.protocol,
      type: complaint.type,
      subject: complaint.subject,
      status: complaint.status,
      statusLabel: statusLabels[complaint.status] || complaint.status,
      resolution: complaint.resolution,
      createdAt: complaint.createdAt,
      resolvedAt: complaint.resolvedAt,
      responses: responses.map((r: any) => ({
        message: r.message,
        userName: r.userName || 'Equipe Ouvidoria',
        createdAt: r.createdAt,
      })),
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Erro interno' }, 500);
  }
});

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
