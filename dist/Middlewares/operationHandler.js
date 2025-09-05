"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustStock = void 0;
exports.computeLivraisonScopes = computeLivraisonScopes;
exports.computeOperationSource = computeOperationSource;
const model_1 = require("../Models/model");
const adjustStock = (filter, qtyChange, montantChange) =>
  __awaiter(void 0, void 0, void 0, function* () {
    yield model_1.Stock.findOneAndUpdate(
      filter,
      {
        $inc: { quantite: qtyChange, montant: montantChange },
        $setOnInsert: { produit: filter.produit },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
  });
exports.adjustStock = adjustStock;
// Détermine la source/destination d’une livraison selon les règles
function computeLivraisonScopes(doc) {
  const { produit, depotCentral, region, pointVente } = doc;
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
  return {
    reasonIfInvalid:
      "Livraison invalide: préciser depotCentral=true ou region.",
  };
}
// Source d’une Vente/Sortie
function computeOperationSource(doc) {
  const { produit, depotCentral, region, pointVente } = doc;
  if (depotCentral === true) return { source: { produit, depotCentral: true } };
  if (region) return { source: { produit, region } };
  if (pointVente) return { source: { produit, pointVente } };
  return {
    reasonIfInvalid:
      "Opération invalide: préciser l’emplacement (depotCentral/region/pointVente).",
  };
}
