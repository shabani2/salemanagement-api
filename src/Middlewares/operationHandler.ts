// path: src/models/mouvementStock.ts
import mongoose from "mongoose";
import { Stock } from "../Models/model";

// -----------------
// Types & Helpers fournis
// -----------------

type OID = mongoose.Types.ObjectId;

export interface AdjustStockFilter {
  produit: OID;
  region?: OID;
  pointVente?: OID;
  depotCentral?: boolean;
}

// --- FIX: empêcher les stocks négatifs en décrément ---
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

    if (!res) throw new Error("Stock insuffisant: opération rejetée (négatif interdit)");
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

// Détermine la source/destination d’une livraison selon les règles
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

  // (1) Cas prioritaire demandé: région -> point de vente
  if (region && pointVente) {
    return {
      source: { produit, region },
      destination: { produit, pointVente },
    };
  }

  // (2) depotCentral=true => source = central; destination = region || pointVente (si fourni)
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

  // (3) region seul => source = region; destination = (pointVente ?) sinon undefined
  if (region) {
    return {
      source: { produit, region },
      destination: pointVente ? { produit, pointVente } : undefined,
    };
  }

  // (4) pointVente seul => destination=pointVente (utile pour crédit à l'update quand le doc n'a plus region)
  if (pointVente && !region && !depotCentral) {
    return { destination: { produit, pointVente } };
  }

  return {
    reasonIfInvalid: "Livraison invalide: préciser depotCentral=true ou region.",
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
// HOOKS fournis (avec corrections ciblées)
// -----------------

export function attachMouvementHooks(MouvementStockSchema: mongoose.Schema) {
  // PRE SAVE
  MouvementStockSchema.pre("save", async function (next) {
    try {
      const { type, statut, quantite } = this as any;

      // Entrée & Commande: pas de contrôle de dispo
      if (type === "Entrée" || type === "Commande") return next();

      // LIVRAISON: vérifier le stock de la *source* uniquement
      if (type === "Livraison") {
        // Calcul à partir de l'état entrant
        const { source, destination, reasonIfInvalid } = computeLivraisonScopes(this);
        if (!source)
          return next(new Error(reasonIfInvalid || "Livraison invalide"));

        const srcStock = await Stock.findOne(source).lean().exec();
        if (!srcStock || srcStock.quantite < quantite) {
          return next(new Error("Stock source insuffisant pour la livraison"));
        }

        // *** FIX demandé ***
        // Si on reçoit regionId + pointVenteId, on rattache le mouvement *au point de vente* :
        // - on mémorise les portées pour post-save
        // - on reset `region` pour que le doc sauvegardé appartienne au pointVente
        const hadRegionAndPV = !!((this as any).region && (this as any).pointVente);
        if (hadRegionAndPV) {
          (this as any)._livraisonScopes = { source, destination };
          (this as any).set?.("region", undefined);
          (this as any).region = undefined;
        }

        return next();
      }

      // VENTE / SORTIE: vérifier la source selon depotCentral/region/pointVente
      if (["Vente", "Sortie"].includes(type)) {
        const { source, reasonIfInvalid } = computeOperationSource(this);
        if (!source) return next(new Error(reasonIfInvalid || "Portée invalide"));

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
      const {
        produit,
        quantite,
        type,
        statut,
        montant,
        transferApplied,
      } = doc as any;

      // ENTRÉE: on crédite directement la destination (region sinon central)
      if (type === "Entrée") {
        if ((doc as any).region)
          await adjustStock({ produit, region: (doc as any).region }, quantite, montant);
        else
          await adjustStock({ produit, depotCentral: true }, quantite, montant);
        return;
      }

      // Pour les autres, si statut falsy et type !== Livraison, on ne touche pas (comportement existant)
      if (!statut && type !== "Livraison") return;

      // VENTE / SORTIE: décrémente la source quand statut=true
      if (["Vente", "Sortie"].includes(type)) {
        const { source, reasonIfInvalid } = computeOperationSource(doc);
        if (!source) return console.error(reasonIfInvalid);
        await adjustStock(source, -quantite, -montant);
        return;
      }

      // LIVRAISON:
      if (type === "Livraison") {
        // Utiliser les portées mémorisées si la région a été reset en pre-save
        const memo = (doc as any)._livraisonScopes as
          | { source?: AdjustStockFilter; destination?: AdjustStockFilter }
          | undefined;
          //@ts-ignore
        const { source, destination, reasonIfInvalid } =
          memo ?? computeLivraisonScopes(doc);
        if (!source) return console.error(reasonIfInvalid);

        // 1) Toujours décrémenter la source immédiatement
        await adjustStock(source, -quantite, -montant);

        // 2) Crédite la destination *seulement* si statut=true au moment de la création
        if (statut && destination && !transferApplied) {
          await adjustStock(destination, quantite, montant);
          // Marquer comme appliqué pour éviter double crédit à l’update
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

  // PRE UPDATE
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

  // POST UPDATE
  MouvementStockSchema.post("findOneAndUpdate", async function (resDoc: any) {
    try {
      if (!resDoc) return;
      const oldDoc = (this as any)._oldDoc as any;
      const newDoc = await (this.model as any).findById(resDoc._id).lean().exec();
      if (!oldDoc || !newDoc) return;

      // Transition false -> true ?
      const wasFalse = !oldDoc.statut;
      const isTrue = !!newDoc.statut;

      if (newDoc.type !== "Livraison") return;
      if (!(wasFalse && isTrue)) return;

      // Créditer la destination si pas encore fait
      if (newDoc.transferApplied) return;

      const { destination, reasonIfInvalid } = computeLivraisonScopes(newDoc);
      if (!destination) {
        console.error(reasonIfInvalid || "Livraison sans destination à l’update");
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
