// ===============================================
// file: src/models/organisation.ts
// ===============================================
import mongoose, { Schema } from "mongoose";
import { IOrganisation } from "../Models/interfaceModels";

const OrganisationSchema = new Schema<IOrganisation>(
  {
    nom: { type: String, required: true },
    idNat: { type: String, required: true }, // slug/sous-domaine
    contact: { type: String, required: true },
    numeroImpot: { type: String, required: true },
    logo: { type: String },
    devise: { type: String, required: true },
    superAdmin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pays: { type: String, required: true },
    emailEntreprise: { type: String, required: true },
  },
  { timestamps: true }
);

// ⚠️ unique + index pour résolution rapide par slug
OrganisationSchema.index({ idNat: 1 }, { unique: true });

export const Organisations = mongoose.model<IOrganisation>(
  "Organisation",
  OrganisationSchema
);

// ===============================================
// file: src/tenancy/tenantContext.ts
// ===============================================
import { AsyncLocalStorage } from "node:async_hooks";
import mongoose from "mongoose";

type TenantStore = { tenantId: mongoose.Types.ObjectId | null };
const als = new AsyncLocalStorage<TenantStore>();

export function runWithTenant<T>(
  tenantId: mongoose.Types.ObjectId | string | null,
  fn: () => T
): T {
  const normalized = tenantId ? new mongoose.Types.ObjectId(String(tenantId)) : null;
  return als.run({ tenantId: normalized }, fn);
}

export function getTenantId(): mongoose.Types.ObjectId | null {
  return als.getStore()?.tenantId ?? null;
}



// ===============================================
// FRONTEND: src/lib/api.ts (votre code axios, headers tenant)
// ===============================================
import axios from "axios";

// ... votre code existant (getApiUrl etc.) ...

