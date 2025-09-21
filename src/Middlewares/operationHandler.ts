// path: src/models/mouvementStock.ts
import mongoose from "mongoose";
import { Stock } from "../Models/model";

// -----------------
// Types & Helpers
// -----------------
type OID = mongoose.Types.ObjectId;

export interface AdjustStockFilter {
  produit: OID;
  region?: OID;
  pointVente?: OID;
  depotCentral?: boolean;
}

type LivraisonOverride = {
  source?: AdjustStockFilter;
  destination?: AdjustStockFilter;
};

// --- Empêcher les stocks négatifs en décrément ---
export const adjustStock = async (
  filter: AdjustStockFilter,
  qtyChange: number,
  montantChange: number,
): Promise<void> => {
  if (qtyChange < 0) {
    const res = await Stock.findOneAndUpdate(
      { ...filter, quantite: { $gte: Math.abs(qtyChange) } },
      { $inc: { quantite: qtyChange, montant: montantChange } },
      { new: true, upsert: false },
    )
      .lean()
      .exec();

    if (!res)
      throw new Error(
        "Stock insuffisant: opération rejetée (négatif interdit)",
      );
    return;
  }

  await Stock.findOneAndUpdate(
    filter,
    {
      $inc: { quantite: qtyChange, montant: montantChange },
      $setOnInsert: { produit: filter.produit },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();
};

// Détermine la source/destination d’une livraison (fallback si pas d’override)
export function computeLivraisonScopes(doc: any): {
  source?: AdjustStockFilter;
  destination?: AdjustStockFilter;
  reasonIfInvalid?: string;
} {
  const { produit, depotCentral, region, pointVente } = doc as {
    produit: OID;
    depotCentral?: boolean;
    region?: OID;
    pointVente?: OID;
  };

  // Cas standard historique: REGION -> PV
  if (region && pointVente) {
    return {
      source: { produit, region },
      destination: { produit, pointVente },
    };
  }

  // CENTRAL -> (REGION | PV)
  if (depotCentral === true) {
    return {
      source: { produit, depotCentral: true },
      destination: pointVente
        ? { produit, pointVente }
        : region
          ? { produit, region }
          : undefined,
    };
  }

  // REGION -> (PV ?)
  if (region) {
    return {
      source: { produit, region },
      destination: pointVente ? { produit, pointVente } : undefined,
    };
  }

  // PV seul: destination = PV (utile en crédit différé)
  if (pointVente && !region && !depotCentral) {
    return { destination: { produit, pointVente } };
  }

  return {
    reasonIfInvalid:
      "Livraison invalide: préciser depotCentral=true ou region.",
  };
}

// Source d’une Vente/Sortie (inchangé)
export function computeOperationSource(doc: any): {
  source?: AdjustStockFilter;
  reasonIfInvalid?: string;
} {
  const { produit, depotCentral, region, pointVente } = doc as {
    produit: OID;
    depotCentral?: boolean;
    region?: OID;
    pointVente?: OID;
  };

  if (depotCentral === true) return { source: { produit, depotCentral: true } };
  if (region) return { source: { produit, region } };
  if (pointVente) return { source: { produit, pointVente } };

  return {
    reasonIfInvalid:
      "Opération invalide: préciser l’emplacement (depotCentral/region/pointVente).",
  };
}

// -----------------
// HOOKS (avec override _livraisonScopes)
// -----------------
export function attachMouvementHooks(MouvementStockSchema: mongoose.Schema) {
  // PRE SAVE
  MouvementStockSchema.pre("save", async function (next) {
    try {
      const { type, statut, quantite } = this as any;

      // Entrée & Commande: pas de contrôle
      if (type === "Entrée" || type === "Commande") return next();

      // LIVRAISON: vérifier la source (avec override si fourni)
      if (type === "Livraison") {
        const hint = (this as any)._livraisonScopes as
          | LivraisonOverride
          | undefined;
        const computed = computeLivraisonScopes(this);
        const chosen = {
          source: hint?.source ?? computed.source,
          destination: hint?.destination ?? computed.destination,
          reasonIfInvalid:
            hint?.source || hint?.destination
              ? undefined
              : computed.reasonIfInvalid,
        };

        if (!chosen.source) {
          return next(
            new Error(chosen.reasonIfInvalid || "Livraison invalide"),
          );
        }

        const srcStock = await Stock.findOne(chosen.source).lean().exec();
        if (!srcStock || srcStock.quantite < quantite) {
          return next(new Error("Stock source insuffisant pour la livraison"));
        }

        // Mémoriser pour post-save (why: garantir la même orientation)
        (this as any)._livraisonScopes = chosen;

        // Option traçabilité: rattacher au PV si region & PV présents
        const hasRegionAndPV = !!(
          (this as any).region && (this as any).pointVente
        );
        if (hasRegionAndPV) {
          (this as any).set?.("region", undefined);
          (this as any).region = undefined;
        }
        return next();
      }

      // VENTE / SORTIE: vérifier la source quand statut=true
      if (["Vente", "Sortie"].includes(type)) {
        const { source, reasonIfInvalid } = computeOperationSource(this);
        if (!source)
          return next(new Error(reasonIfInvalid || "Portée invalide"));

        if (statut) {
          const s = await Stock.findOne(source).lean().exec();
          if (!s || s.quantite < quantite) {
            return next(new Error("Stock insuffisant pour l'opération"));
          }
        }
        return next();
      }

      next();
    } catch (error) {
      next(error as mongoose.CallbackError);
    }
  });

  // POST SAVE
  MouvementStockSchema.post("save", async function (doc) {
    try {
      const { produit, quantite, type, statut, montant, transferApplied } =
        doc as any;

      // ENTRÉE: crédit direct
      if (type === "Entrée") {
        if ((doc as any).region)
          await adjustStock(
            { produit, region: (doc as any).region },
            quantite,
            montant,
          );
        else
          await adjustStock({ produit, depotCentral: true }, quantite, montant);
        return;
      }

      // Si statut falsy et pas Livraison, ne rien faire (comportement existant)
      if (!statut && type !== "Livraison") return;

      // VENTE / SORTIE
      if (["Vente", "Sortie"].includes(type)) {
        const { source, reasonIfInvalid } = computeOperationSource(doc);
        if (!source) return console.error(reasonIfInvalid);
        await adjustStock(source, -quantite, -montant);
        return;
      }

      // LIVRAISON
      if (type === "Livraison") {
        const memo = (doc as any)._livraisonScopes as
          | LivraisonOverride
          | undefined;
        const fallback = computeLivraisonScopes(doc);
        const chosen = {
          source: memo?.source ?? fallback.source,
          destination: memo?.destination ?? fallback.destination,
        };
        if (!chosen.source) return console.error(fallback.reasonIfInvalid);

        // 1) Débiter la source
        await adjustStock(chosen.source, -quantite, -montant);

        // 2) Créditer la destination si statut=true (une seule fois)
        if (statut && chosen.destination && !transferApplied) {
          await adjustStock(chosen.destination, quantite, montant);
          await (doc.constructor as any).updateOne(
            { _id: (doc as any)._id, transferApplied: { $ne: true } },
            { $set: { transferApplied: true } },
          );
        }
      }
    } catch (err) {
      console.error("Erreur post-save MouvementStock:", err);
    }
  });

  // PRE UPDATE: snapshot ancien doc
  MouvementStockSchema.pre("findOneAndUpdate", async function (next) {
    try {
      (this as any)._oldDoc = await (this.model as any)
        .findOne(this.getQuery())
        .lean()
        .exec();
      next();
    } catch (e) {
      next(e as mongoose.CallbackError);
    }
  });

  // POST UPDATE: crédit différé si Livraison passe false->true
  MouvementStockSchema.post("findOneAndUpdate", async function (resDoc: any) {
    try {
      if (!resDoc) return;
      const oldDoc = (this as any)._oldDoc as any;
      const newDoc = await (this.model as any)
        .findById(resDoc._id)
        .lean()
        .exec();
      if (!oldDoc || !newDoc) return;

      const wasFalse = !oldDoc.statut;
      const isTrue = !!newDoc.statut;

      if (newDoc.type !== "Livraison") return;
      if (!(wasFalse && isTrue)) return;
      if (newDoc.transferApplied) return;

      const { destination, reasonIfInvalid } = computeLivraisonScopes(newDoc);
      if (!destination) {
        console.error(
          reasonIfInvalid || "Livraison sans destination à l’update",
        );
        return;
      }

      await adjustStock(destination, newDoc.quantite, newDoc.montant);
      await (this.model as any).updateOne(
        { _id: newDoc._id, transferApplied: { $ne: true } },
        { $set: { transferApplied: true } },
      );
    } catch (err) {
      console.error("Erreur post-update MouvementStock:", err);
    }
  });
}

// Attacher une seule fois
if (!(mongoose as any)._mvtHooksAttached) {
  // @ts-ignore: obtenir le schema depuis mongoose.models si nécessaire
  // Exemple: import { MouvementStock } du côté modèle et appeler attachMouvementHooks(MouvementStock.schema)
  (mongoose as any)._mvtHooksAttached = true;
}
