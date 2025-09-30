
// ===============================================
// file: src/models/plugins/withTenant.ts  (si pas encore ajouté)
// ===============================================
import mongoose, { Schema } from "mongoose";
import { getTenantId } from "../../tenancy/tenantContext";

type Opts = { tenantKey?: string; ref?: string; required?: boolean };
export function withTenant(schema: Schema, opts: Opts = {}) {
  const tenantKey = opts.tenantKey ?? "organisation";
  const ref = opts.ref ?? "Organisation";
  const required = opts.required ?? true;

  if (!schema.path(tenantKey)) {
    schema.add({ [tenantKey]: { type: mongoose.Schema.Types.ObjectId, ref, required, index: true } });
  }

  const ensureQueryHasTenant = function (this: any) {
    const tid = getTenantId();
    if (!tid) throw new Error("Tenant non défini dans le contexte.");
    const q = this.getQuery() || {};
    if (!(tenantKey in q)) this.setQuery({ ...q, [tenantKey]: tid });
  };

  function ensureUpdateHasTenant(this: any) {
    ensureQueryHasTenant.call(this);
    const update = this.getUpdate() || {};
    if (!("$setOnInsert" in update)) update.$setOnInsert = {};
    if (!(tenantKey in update.$setOnInsert)) update.$setOnInsert[tenantKey] = getTenantId();
    this.setUpdate(update);
  }

  schema.pre("save", function (next) {
    // @ts-ignore
    if (!this[tenantKey]) {
      const tid = getTenantId();
      if (!tid) return next(new Error("Tenant non défini dans le contexte."));
      // @ts-ignore
      this[tenantKey] = tid;
    }
    next();
  });

  schema.pre("insertMany", function (next, docs: any[]) {
    const tid = getTenantId();
    if (!tid) return next(new Error("Tenant non défini dans le contexte."));
    for (const d of docs) if (!d[tenantKey]) d[tenantKey] = tid;
    next();
  });

  schema.pre("find", ensureQueryHasTenant);
  schema.pre("findOne", ensureQueryHasTenant);
  schema.pre("count", ensureQueryHasTenant);
  schema.pre("countDocuments", ensureQueryHasTenant);
  schema.pre("findOneAndDelete", ensureQueryHasTenant);
  schema.pre("findOneAndRemove", ensureQueryHasTenant);
  schema.pre("updateOne", ensureUpdateHasTenant);
  schema.pre("updateMany", ensureUpdateHasTenant);
  schema.pre("findOneAndUpdate", ensureUpdateHasTenant);

  schema.pre("aggregate", function (next) {
    const tid = getTenantId();
    if (!tid) return next(new Error("Tenant non défini dans le contexte."));
    const pipeline = this.pipeline();
    const hasMatch = pipeline.some((st: any) => st.$match && tenantKey in st.$match);
    if (!hasMatch) this.pipeline().unshift({ $match: { [tenantKey]: tid } });
    next();
  });
}
