// ===============================================
// file: src/middlewares/tenant.ts
// ===============================================
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { runWithTenant } from "../tenancy/tenantContext";
import { Organisations } from "../models/organisation";

type CacheEntry = { id: string; at: number };
const SLUG_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCachedSlug(slug: string): string | null {
  const hit = SLUG_CACHE.get(slug);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    SLUG_CACHE.delete(slug);
    return null;
  }
  return hit.id;
}
function setCachedSlug(slug: string, id: string) {
  SLUG_CACHE.set(slug, { id, at: Date.now() });
}

// Robust host parsing behind proxies
function getHost(req: Request): string {
  const xfwd = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim();
  const raw = xfwd || req.headers.host || "";
  return raw.split(":")[0].toLowerCase();
}

// Extract: foo.example.com -> foo  |  localhost -> null  |  herokuapp.com -> null (not multi-tenant)
function extractSubdomain(host: string): string | null {
  if (!host) return null;
  // ignore localhost, ip
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  // if using *.yourdomain.tld (recommended)
  const parts = host.split(".");
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub === "www") return null;
    // if herokuapp.com, sub is the app name (not an org slug)
    if (host.endsWith(".herokuapp.com")) return null;
    return sub;
  }
  return null;
}

function isValidObjectId(v?: string | null): v is string {
  return !!v && mongoose.Types.ObjectId.isValid(v);
}

async function slugToOrgId(slug: string): Promise<string | null> {
  const cached = getCachedSlug(slug);
  if (cached) return cached;
  const org = await Organisations.findOne({ idNat: slug }).select("_id").lean();
  const id = org?._id?.toString() ?? null;
  if (id) setCachedSlug(slug, id);
  return id;
}

/**
 * Resolve tenantId from request. Priority:
 * 1) req.user.organisation
 * 2) header x-tenant-id (ObjectId)
 * 3) header x-tenant-slug (string) -> lookup by Organisations.idNat
 * 4) subdomain (string) -> lookup by Organisations.idNat
 */
export async function resolveTenantFromRequest(req: Request): Promise<string | null> {
  const fromUser =
    (req as any).user?.organisation?._id?.toString() ||
    (req as any).user?.organisation?.toString() ||
    null;

  if (isValidObjectId(fromUser)) return fromUser;

  const hId = (req.headers["x-tenant-id"] as string | undefined)?.trim() || null;
  if (isValidObjectId(hId)) return hId;

  const hSlug = (req.headers["x-tenant-slug"] as string | undefined)?.trim() || null;
  if (hSlug) {
    const id = await slugToOrgId(hSlug.toLowerCase());
    if (isValidObjectId(id)) return id!;
  }

  const host = getHost(req);
  const sub = extractSubdomain(host);
  if (sub) {
    const id = await slugToOrgId(sub.toLowerCase());
    if (isValidObjectId(id)) return id!;
  }

  return null;
}

/**
 * Middleware: sets AsyncLocalStorage context if a tenant is found.
 * Does NOT force a tenant globally; models will throw only if an operation requires one.
 */
export async function tenantInjector(req: Request, _res: Response, next: NextFunction) {
  try {
    const tenantId = await resolveTenantFromRequest(req);
    if (!tenantId) return next();
    runWithTenant(tenantId, next);
  } catch (e) {
    next(e);
  }
}

// Helper for routes that must require a tenant (e.g., /auth/login)
export function requireTenant() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tid = await resolveTenantFromRequest(req);
    if (!tid) return res.status(400).json({ error: "Tenant introuvable (x-tenant-id, x-tenant-slug ou sous-domaine)" });
    runWithTenant(tid, next);
  };
}
