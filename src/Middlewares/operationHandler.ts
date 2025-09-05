import mongoose, { Types } from "mongoose";
import { Stock } from "../Models/model";


type OID = mongoose.Types.ObjectId;

export interface AdjustStockFilter {
  produit: OID;
  region?: OID;
  pointVente?: OID;
  depotCentral?: boolean;
}

export const adjustStock = async (
  filter: AdjustStockFilter,
  qtyChange: number,
  montantChange: number
): Promise<void> => {
  await Stock.findOneAndUpdate(
    filter,
    {
      $inc: { quantite: qtyChange, montant: montantChange },
      $setOnInsert: { produit: filter.produit },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
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

  // Règles:
  // - depotCentral=true => source = central; destination = region || pointVente (si fourni)
  // - sinon si region && pointVente => source = region; destination = pointVente
  // - sinon si region seul => source = region; destination = undefined (livraison sortante non finalisée)
  // - sinon (pas depotCentral, pas region) => invalide (on ne sait pas d’où sort la marchandise)
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

  if (region && pointVente) {
    return {
      source: { produit, region },
      destination: { produit, pointVente },
    };
  }

  if (region) {
    return {
      source: { produit, region },
      destination: pointVente ? { produit, pointVente } : undefined,
    };
  }

  return { reasonIfInvalid: "Livraison invalide: préciser depotCentral=true ou region." };
}

// Source d’une Vente/Sortie
export function computeOperationSource(doc: any): { source?: AdjustStockFilter; reasonIfInvalid?: string } {
  const { produit, depotCentral, region, pointVente } = doc as {
    produit: OID; depotCentral?: boolean; region?: OID; pointVente?: OID;
  };

  if (depotCentral === true) return { source: { produit, depotCentral: true } };
  if (region) return { source: { produit, region } };
  if (pointVente) return { source: { produit, pointVente } };

  return { reasonIfInvalid: "Opération invalide: préciser l’emplacement (depotCentral/region/pointVente)." };
}
