import { Request, Response } from "express";
import { Stock } from "../Models/model";
import { Types } from "mongoose";

// 🔹 Obtenir tous les stocks

/** ===========================================================
 * Helpers: tri + déduplication côté serveur
 * - Key = produitId | (pointVenteId || regionId || DEPOT_CENTRAL)
 * - On présuppose un tri DESC sur updatedAt/createdAt pour garder le 1er vu
 * =========================================================== */

const getIdStr = (v: any): string => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v._id) {
    const s = v._id.toString?.();
    if (typeof s === "string") return s;
  }
  return v.toString?.() ?? "";
};

const keyOf = (s: any): string => {
  const prodId = getIdStr(s?.produit);
  const locId =
    getIdStr(s?.pointVente) ||
    getIdStr(s?.region) ||
    "DEPOT_CENTRAL";
  return `${prodId}|${locId}`;
};

const collapseLatest = <T extends { updatedAt?: Date; createdAt?: Date }>(rows: T[]): T[] => {
  // rows triées desc → le premier rencontré est le plus récent
  const seen = new Map<string, T>();
  for (const r of rows) {
    const k = keyOf(r as any);
    if (!seen.has(k)) seen.set(k, r);
  }
  return Array.from(seen.values());
};

/** ===========================================================
 * GET /stocks (tous)
 * - Tri par dernière modif
 * - Déduplication (dernier état par couple produit/emplacement)
 * =========================================================== */
export const getAllStocks = async (req: Request, res: Response) => {
  try {
    const stocks = await Stock.find()
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .populate({
        path: "produit",
        populate: { path: "categorie", model: "Categorie" },
      })
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate("region");
//@ts-ignore
    const uniques = collapseLatest(stocks);
    res.json(uniques);
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};

/** ===========================================================
 * GET /stocks/region/:regionId
 * - Filtre région (région directe OU région du point de vente)
 * - Tri par dernière modif
 * - Déduplication (dernier état par couple produit/emplacement)
 * =========================================================== */
export const getStocksByRegion = async (req: Request, res: Response) => {
  try {
    const { regionId } = req.params;

    const stocks = await Stock.find()
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .populate({
        path: "produit",
        populate: { path: "categorie", model: "Categorie" },
      })
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate("region");

    // garde ce qui match la région (dépôt central OU PV de cette région)
    const candidats = stocks.filter(
      (s: any) =>
        getIdStr(s?.pointVente?.region?._id) === regionId ||
        getIdStr(s?.region?._id) === regionId
    );
//@ts-ignore
    const uniques = collapseLatest(candidats);
    res.json(uniques);
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};

/** ===========================================================
 * GET /stocks/point-vente/:pointVenteId
 * - Filtre point de vente
 * - Tri par dernière modif
 * - Déduplication (dernier état par couple produit/emplacement)
 *   (utile si plusieurs versions d’un même produit existent)
 * =========================================================== */
export const getStocksByPointVente = async (req: Request, res: Response) => {
  try {
    const { pointVenteId } = req.params;

    if (!pointVenteId) {
      res.status(400).json({ message: "ID du point de vente requis" });
      return;
    }

    const stocks = await Stock.find({ pointVente: pointVenteId })
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .populate({
        path: "produit",
        populate: { path: "categorie", model: "Categorie" },
      })
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate("region");
//@ts-ignore
    const uniques = collapseLatest(stocks);
    res.json(uniques);
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};

/** ===========================================================
 * GET /stocks/:id (one)
 * - Inchangé : charge un document précis
 * =========================================================== */
export const getStockById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const stock = await Stock.findById(id)
      .populate({
        path: "produit",
        populate: { path: "categorie", model: "Categorie" },
      })
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate("region");

    if (!stock) {
      res.status(404).json({ message: "Stock non trouvé" });
      return;
    }

    res.json(stock);
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};

// 🔹 Créer un stock
export const createStock = async (req: Request, res: Response) => {
  try {
    const { produit, quantite, montant, pointVente, depotCentral } = req.body;

    if (!pointVente && depotCentral !== true) {
      res.status(400).json({
        message:
          "Un stock doit être associé à un point de vente ou être marqué comme provenant du dépôt central.",
      });
      return;
    }

    const stock = new Stock({
      produit,
      quantite,
      montant,
      pointVente: pointVente || undefined,
      depotCentral: depotCentral || false,
    });

    await stock.save();
    res.status(201).json(stock);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

// 🔹 Mettre à jour un stock
export const updateStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { produit, quantite, montant, pointVente, depotCentral } = req.body;

    if (!pointVente && depotCentral !== true) {
      res.status(400).json({
        message:
          "Un stock doit être associé à un point de vente ou être marqué comme provenant du dépôt central.",
      });
      return;
    }

    const updated = await Stock.findByIdAndUpdate(
      id,
      {
        produit,
        quantite,
        montant,
        pointVente,
        depotCentral,
      },
      { new: true },
    );

    if (!updated) {
      res.status(404).json({ message: "Stock non trouvé" });
      return;
    }

    res.json(updated);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Erreur lors de la mise à jour", error: err });
  }
};

// 🔹 Supprimer un stock
export const deleteStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Stock.findByIdAndDelete(id);
    res.json({ message: "Stock supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const checkStock = async (
  type: string,
  produitId: string,
  pointVenteId?: string,
): Promise<number> => {
  if (!Types.ObjectId.isValid(produitId)) {
    console.warn("checkStock: produitId invalide", produitId);
    return 0;
  }

  if (pointVenteId && !Types.ObjectId.isValid(pointVenteId)) {
    console.warn("checkStock: pointVenteId invalide", pointVenteId);
    return 0;
  }

  let query: any = { produit: produitId };

  if (type === "Livraison") {
    query.depotCentral = true;
  } else if (["Vente", "Commande", "Sortie"].includes(type)) {
    if (!pointVenteId) {
      console.warn("checkStock: pointVenteId manquant pour type", type);
      return 0;
    }
    query.pointVente = pointVenteId;
  } else {
    console.warn("checkStock: type invalide", type);
    return 0;
  }

  console.log("checkStock query", query);
  const stock = await Stock.findOne(query);
  console.log("stock result =", stock ?? "NO STOCK FOUND");

  return stock?.quantite || 0;
};

export const checkStockHandler = async (req: Request, res: Response) => {
  const { type, produitId, quantite, pointVenteId } = req.body;

  if (!type || !produitId || quantite == null) {
    res.status(400).json({ success: false, message: "Paramètres manquants" });
    return;
  }

  try {
    const quantiteDisponible = await checkStock(type, produitId, pointVenteId);
    console.log("quantiteDisponible:", quantiteDisponible);

    res.json({
      success: true,
      quantiteDisponible,
      suffisant: quantiteDisponible >= quantite,
    });
    return;
  } catch (error) {
    console.error("Erreur API checkStock:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
    return;
  }
};
