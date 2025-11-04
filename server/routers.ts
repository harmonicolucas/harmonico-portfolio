import crypto from "node:crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { portfolioRouter } from "./portfolio/router";

const LOCAL_APP_ID = "local";
const LOCAL_OPEN_ID = "local-admin";
const loginAttempts = new Map<string, number[]>();

function sameSecret(left: string, right: string) {
  const a = crypto.createHash("sha256").update(left).digest();
  const b = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(a, b);
}

function allowLoginAttempt(key: string) {
  const now = Date.now();
  const recent = (loginAttempts.get(key) ?? []).filter(at => now - at < 15 * 60 * 1000);
  if (recent.length >= 8) return false;
  recent.push(now);
  loginAttempts.set(key, recent);
  return true;
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ email: z.string().trim().max(320), password: z.string().max(200) }))
      .mutation(async ({ ctx, input }) => {
        const expectedEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
        const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
        const ip = String(ctx.req.headers["x-forwarded-for"] ?? ctx.req.socket?.remoteAddress ?? "local");
        if (!expectedEmail || !expectedPassword || !process.env.ADMIN_SESSION_SECRET) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "O login local não está configurado." });
        }
        if (!allowLoginAttempt(ip)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Demasiadas tentativas. Aguarde 15 minutos." });
        }
        const typedEmail = input.email.trim().toLowerCase();
        const acceptedEmail = typedEmail === expectedEmail || typedEmail === "harmonicolucas@gmai.com";
        const passwordOk = sameSecret(input.password, expectedPassword);
        if (!acceptedEmail || !passwordOk) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorrectos." });
        }
        const token = await sdk.signSession(
          { openId: LOCAL_OPEN_ID, appId: LOCAL_APP_ID, name: "Harmónico Lucas" },
          { expiresInMs: ONE_YEAR_MS },
        );
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
        return { ok: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  portfolio: portfolioRouter,
});

export type AppRouter = typeof appRouter;
