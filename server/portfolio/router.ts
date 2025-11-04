import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  findMissingTranslations,
  findReviewFlags,
  zContactMessage,
  zContent,
} from "../../shared/content";
import { notifyOwner } from "../_core/notification";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { buildDefaultContent } from "../defaultContent";
import * as store from "./store";

function clientIp(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }) {
  const fwd = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
  return fwd || req.socket?.remoteAddress || "unknown";
}
function ipHash(ip: string) {
  return crypto.createHash("sha256").update(`pf:${ip}`).digest("hex").slice(0, 40);
}

// simple in-memory throttles (per instance)
const hits = new Map<string, number[]>();
function throttle(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter(t => now - t < windowMs);
  if (list.length >= max) return false;
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return true;
}

const who = (u: { name?: string | null; email?: string | null; openId: string }) =>
  (u.name || u.email || u.openId).slice(0, 200);

export const portfolioRouter = router({
  /** Public document. Admins may request the draft for preview. */
  content: publicProcedure
    .input(z.object({ preview: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (input?.preview && ctx.user?.role === "admin") {
        const state = await store.getEditorState();
        return { content: state.draft, publishedAt: state.publishedAt, preview: true };
      }
      const pub = await store.getPublished();
      return { content: pub.content, publishedAt: pub.publishedAt, preview: false };
    }),

  sendMessage: publicProcedure.input(zContactMessage).mutation(async ({ ctx, input }) => {
    if (input.website) return { ok: true }; // honeypot: silently ignore bots
    const ip = clientIp(ctx.req as never);
    const h = ipHash(ip);
    if (!throttle(`msg:${h}`, 3, 10 * 60 * 1000) || (await store.countRecentMessagesFrom(h, 60 * 60 * 1000)) >= 8) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiadas mensagens. Tente mais tarde." });
    }
    await store.insertMessage({
      name: input.name,
      email: input.email,
      subject: input.subject || null,
      message: input.message,
      lang: input.lang,
      ipHash: h,
    });
    notifyOwner({
      title: `Nova mensagem do portefólio: ${input.name}`,
      content: `${input.name} <${input.email}>\n\n${input.message}`.slice(0, 4000),
    }).catch(() => undefined);
    return { ok: true };
  }),

  coffee: router({
    get: publicProcedure.query(async () => ({ count: Number((await store.kvGet("coffee_count")) ?? 0) })),
    add: publicProcedure.mutation(async ({ ctx }) => {
      const h = ipHash(clientIp(ctx.req as never));
      if (!throttle(`coffee:${h}`, 5, 60 * 1000)) {
        return { count: Number((await store.kvGet("coffee_count")) ?? 0) };
      }
      return { count: await store.incrementCounter("coffee_count") };
    }),
  }),

  /** Admin bootstrap for a logged-in user. */
  access: router({
    status: protectedProcedure.query(async ({ ctx }) => ({
      isAdmin: ctx.user.role === "admin",
      adminExists: (await store.adminCount()) > 0,
    })),
    claim: protectedProcedure
      .input(z.object({ code: z.string().min(6).max(100) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role === "admin") return { ok: true };
        if (!throttle(`claim:${ctx.user.id}`, 5, 15 * 60 * 1000)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiadas tentativas. Aguarde 15 minutos." });
        }
        const result = await store.claimFirstAdmin(ctx.user.id, input.code);
        if (result === "taken") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Já existe um administrador. Peça-lhe acesso." });
        }
        if (result === "invalid") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Código de activação inválido." });
        }
        return { ok: true };
      }),
  }),

  admin: router({
    state: adminProcedure.query(async () => {
      const state = await store.getEditorState();
      return {
        ...state,
        missingTranslations: findMissingTranslations(state.draft),
        reviewFlags: findReviewFlags(state.draft),
        unreadMessages: await store.unreadMessageCount(),
      };
    }),
    saveDraft: adminProcedure.input(z.object({ content: zContent })).mutation(async ({ input }) => {
      await store.saveDraft(input.content);
      return {
        ok: true,
        savedAt: new Date(),
        missingTranslations: findMissingTranslations(input.content),
        reviewFlags: findReviewFlags(input.content),
      };
    }),
    publish: adminProcedure
      .input(z.object({ note: z.string().max(300).optional() }).optional())
      .mutation(async ({ ctx, input }) => {
        await store.publishDraft(who(ctx.user), input?.note);
        return { ok: true, publishedAt: new Date() };
      }),
    discardDraft: adminProcedure.mutation(async () => {
      await store.discardDraft();
      return { ok: true };
    }),
    backup: adminProcedure
      .input(z.object({ note: z.string().max(300).optional() }).optional())
      .mutation(async ({ ctx, input }) => {
        await store.createBackup(who(ctx.user), input?.note);
        return { ok: true };
      }),
    revisions: adminProcedure.query(() => store.listRevisions()),
    revision: adminProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => {
      const rev = await store.getRevision(input.id);
      if (!rev) throw new TRPCError({ code: "NOT_FOUND", message: "Revisão não encontrada" });
      return rev;
    }),
    restoreRevision: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
      const rev = await store.getRevision(input.id);
      if (!rev) throw new TRPCError({ code: "NOT_FOUND", message: "Revisão não encontrada" });
      const parsed = zContent.safeParse(rev.data);
      if (!parsed.success) throw new TRPCError({ code: "BAD_REQUEST", message: "Revisão inválida" });
      await store.importIntoDraft(parsed.data, who(ctx.user), "restore", `Restaurada a revisão #${rev.id}`);
      return { ok: true };
    }),
    importContent: adminProcedure.input(z.object({ content: zContent })).mutation(async ({ ctx, input }) => {
      await store.importIntoDraft(input.content, who(ctx.user), "import", "Importação de ficheiro JSON");
      return { ok: true };
    }),
    resetToDefault: adminProcedure.mutation(async ({ ctx }) => {
      await store.importIntoDraft(buildDefaultContent(), who(ctx.user), "restore", "Reposição do conteúdo inicial");
      return { ok: true };
    }),

    media: router({
      list: adminProcedure.query(() => store.listMedia()),
      update: adminProcedure
        .input(
          z.object({
            id: z.number().int(),
            title: z.string().max(255).optional(),
            altPt: z.string().max(500).optional(),
            altEn: z.string().max(500).optional(),
            captionPt: z.string().max(2000).optional(),
            captionEn: z.string().max(2000).optional(),
          }),
        )
        .mutation(async ({ input }) => {
          const { id, ...patch } = input;
          await store.updateMedia(id, patch);
          return { ok: true };
        }),
      remove: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
        const m = await store.getMedia(input.id);
        if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Ficheiro não encontrado" });
        await store.softDeleteMedia(input.id);
        return { ok: true, url: m.url };
      }),
    }),

    messages: router({
      list: adminProcedure.query(() => store.listMessages()),
      setRead: adminProcedure
        .input(z.object({ id: z.number().int(), isRead: z.boolean() }))
        .mutation(async ({ input }) => {
          await store.setMessageRead(input.id, input.isRead);
          return { ok: true };
        }),
      remove: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
        await store.deleteMessage(input.id);
        return { ok: true };
      }),
    }),
  }),
});
