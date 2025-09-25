// file: src/utils/publicUrl.ts
import type { Request } from "express";

/** Pourquoi: éviter les URLs hardcodées entre environnements et derrière proxy/load balancer. */
const normalizeOrigin = (v?: string): string | undefined => {
  if (!v) return undefined;
  try {
    const u = new URL(v);
    return u.origin;
  } catch {
    // peut être un host simple → ajoute un schéma par défaut
    try {
      const u = new URL(`https://${v}`);
      return u.origin;
    } catch {
      return undefined;
    }
  }
};

const getForwardedOrigin = (req: Request): string | undefined => {
  const forwarded = (req.headers["forwarded"] as string | undefined)?.split(",")[0];
  // RFC 7239: Forwarded: proto=https;host=example.com
  if (forwarded) {
    const proto = /proto=([^;,\s]+)/i.exec(forwarded)?.[1];
    const host = /host=([^;,\s]+)/i.exec(forwarded)?.[1];
    if (proto && host) return `${proto}://${host}`;
  }
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim();
  if (proto && host) return `${proto}://${host}`;
  return undefined;
};

const getHostOrigin = (req: Request): string | undefined => {
  const host = req.get("host");
  if (!host) return undefined;
  // Si Express trust proxy = true, req.protocol reflète X-Forwarded-Proto
  const proto = (req as any).protocol || req.protocol || "https";
  return `${proto}://${host}`;
};

/**
 * Renvoie une base URL publique fiable pour construire des liens externes.
 * - Si ALLOWED_PUBLIC_ORIGINS est défini, on n'accepte qu'un origin présent dans cette liste.
 * - Sinon, on accepte l'origin le plus fiable trouvé.
 * - Fallback: PUBLIC_BASE_URL (env) puis host local.
 */
export function resolveFrontendBaseUrl(req: Request): string {
  const envDefault = process.env.PUBLIC_BASE_URL && normalizeOrigin(process.env.PUBLIC_BASE_URL);
  const allowList = (process.env.ALLOWED_PUBLIC_ORIGINS || "")
    .split(",")
    .map((s) => normalizeOrigin(s?.trim() || ""))
    .filter(Boolean) as string[];

  // Ordre de confiance
  const fromOrigin = normalizeOrigin(req.get("origin") || undefined);
  const fromReferer = normalizeOrigin(req.get("referer") || undefined);
  const fromForwarded = normalizeOrigin(getForwardedOrigin(req));
  const fromHost = normalizeOrigin(getHostOrigin(req));

  const candidates = [fromOrigin, fromReferer, fromForwarded, fromHost, envDefault].filter(
    Boolean,
  ) as string[];

  if (!candidates.length) {
    // dernier recours (dev): http://localhost
    return "http://localhost:3000";
  }

  if (allowList.length) {
    const allowed = candidates.find((c) => allowList.includes(c));
    return allowed || allowList[0]; // fallback: 1er autorisé
  }

  return candidates[0]; // premier candidat fiable
}
