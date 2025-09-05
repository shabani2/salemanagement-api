import { Request, Response } from "express";
import { PointVente, Stock } from "../Models/model";
import { Types } from "mongoose";

// 🔹 Obtenir tous les stocks

/** ===========================================================
 * Helpers: tri + déduplication côté serveur
 * - Key = produitId | (pointVenteId || regionId || DEPOT_CENTRAL)
 * - On présuppose un tri DESC sur updatedAt/createdAt pour garder le 1er vu
 * =========================================================== */

type CheckStockInput = {
  type: "Entrée" | "Vente" | "Sortie" | "Livraison" | "Commande" | string;
  produitId: string;
  regionId?: string;
  pointVenteId?: string;
  depotCentral?: boolean; // ✅ nouveau
};

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
    getIdStr(s?.pointVente) || getIdStr(s?.region) || "DEPOT_CENTRAL";
  return `${prodId}|${locId}`;
};

const collapseLatest = <T extends { updatedAt?: Date; createdAt?: Date }>(
  rows: T[],
): T[] => {
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

    if (!regionId || !Types.ObjectId.isValid(regionId)) {
      res.status(400).json({ message: "ID de région invalide" });
    }
    const regionObjId = new Types.ObjectId(regionId);

    // 1) IDs des PV de la région (forcés en ObjectId)
    const pvIdsRaw = await PointVente.find({ region: regionObjId }).distinct(
      "_id",
    );
    const pvIds = pvIdsRaw.map((id: any) => new Types.ObjectId(id));

    // DEBUG utile
    console.log("[getStocksByRegion] regionId:", regionId, "pvIds:", pvIds);

    // 2) Requête: stocks régionaux OU stocks des PV de cette région
    const query: any = {
      $or: [{ region: regionObjId }],
    };
    if (pvIds.length > 0) {
      query.$or.push({ pointVente: { $in: pvIds } });
    }

    // 3) Lecture
    const stocks = await Stock.find(query)
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

    // 4) Déduplication dernière version
    // @ts-ignore
    const uniques = collapseLatest(stocks);

    res.json(uniques);
  } catch (err) {
    console.error("getStocksByRegion error:", err);
    res.status(500).json({ message: "Erreur interne", error: err });
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

// checkStock.ts
export const checkStock = async ({
  type,
  produitId,
  regionId,
  pointVenteId,
  depotCentral,
}: CheckStockInput): Promise<number> => {
  if (!Types.ObjectId.isValid(produitId)) return 0;
  if (regionId && !Types.ObjectId.isValid(regionId)) return 0;
  if (pointVenteId && !Types.ObjectId.isValid(pointVenteId)) return 0;

  const t = (type || '').toLowerCase();
  const query: any = { produit: produitId };

  // 1) Le central gagne toujours s’il est demandé
  if (depotCentral === true) {
    query.depotCentral = true;
  }
  // 2) Sinon, la région prime si présente (même si pointVenteId est aussi fourni)
  else if (regionId) {
    query.region = regionId;
    query.depotCentral = { $ne: true };
  }
  // 3) Sinon, le point de vente
  else if (pointVenteId) {
    query.pointVente = pointVenteId;
    query.depotCentral = { $ne: true };
  }
  // 4) Fallback: si aucune portée n’est donnée et type ∈ {livraison, vente, sortie} → central
  else if (t === 'livraison' || t === 'vente' || t === 'sortie') {
    query.depotCentral = true;
  }
  // 5) Aucune portée exploitable
  else {
    return 0;
  }

  const stock = await Stock.findOne(query).lean().exec();
  return Number(stock?.quantite ?? 0);
};

// utils
const normId = (v: unknown): string | undefined => {
  if (!v) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && (v as any)?._id) return String((v as any)._id);
  return undefined;
};

// checkStockHandler.ts
export const checkStockHandler = async (req: Request, res: Response) => {
  const { type, produitId, quantite } = req.body as {
    type?: string;
    produitId?: string;
    quantite?: number;
  };
  // ⚠️ early return
  if (!type || !produitId || quantite == null) {
     res.status(400).json({ success: false, message: 'Paramètres manquants' });
  }

  // normaliser/filtrer les scopes
  const depotCentral =
    req.body.depotCentral === true || String(req.body.depotCentral).toLowerCase() === 'true';
  const regionId = normId(req.body.regionId);
  const pointVenteId = normId(req.body.pointVenteId);

  // priorité unifiée côté API (le client ne peut plus forcer un mauvais scope)
  const scope = depotCentral
    ? { depotCentral: true }
    : regionId
    ? { regionId }
    : pointVenteId
    ? { pointVenteId }
    : undefined;

  try {
    const quantiteDisponible = await checkStock({
      type : type ?? '',
      produitId: produitId ?? '',
      regionId: scope?.regionId,
      pointVenteId: scope?.pointVenteId,
      depotCentral: !!scope?.depotCentral,
    });

     res.json({
      success: true,
      quantiteDisponible,
      suffisant: quantiteDisponible >= Number(quantite),
    });
  } catch (e) {
     res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
