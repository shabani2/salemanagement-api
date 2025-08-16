// controllers/pointVenteController.ts
import { Request, Response } from "express";
import mongoose, { ClientSession } from "mongoose";
import { MouvementStock, PointVente, Produit } from "../Models/model";



/** -------------------- Utils pagination/tri/filtre -------------------- */
const parsePagination = (req: Request) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10));
  const skip = (page - 1) * limit;

  const sortBy = (req.query.sortBy as string) || "createdAt"; // "nom" | "createdAt" | ...
  const order = ((req.query.order as string) || "desc").toLowerCase() === "asc" ? 1 : -1;
  const sort = { [sortBy]: order as 1 | -1 };

  return { page, limit, skip, sort };
};

const buildSearchFilter = (req: Request) => {
  const q = (req.query.q as string) || "";
  const region = (req.query.region as string) || "";

  const filter: any = {};
  const $and: any[] = [];

  if (q) {
    $and.push({
      $or: [
        { nom: { $regex: q, $options: "i" } },
        { adresse: { $regex: q, $options: "i" } },
      ],
    });
  }
  if (region && mongoose.Types.ObjectId.isValid(region)) {
    $and.push({ region: new mongoose.Types.ObjectId(region) });
  }
  if ($and.length) filter.$and = $and;

  return filter;
};

const paginationMeta = (page: number, limit: number, total: number) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages };
};

/** -------------------- LISTE: pagination/tri/filtres -------------------- */
export const getAllPointVentes = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip, sort } = parsePagination(req);
    const filter = buildSearchFilter(req);
    const includeTotal = String(req.query.includeTotal ?? "true") !== "false";
    const includeStock = String(req.query.includeStock ?? "false") === "true";

    const query = PointVente.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("region");

    if (includeStock) query.populate("stock.produit");

    const [data, total] = await Promise.all([
      query.exec(),
      includeTotal ? PointVente.countDocuments(filter) : Promise.resolve(-1),
    ]);

    res.json({
      data,
      meta: includeTotal ? paginationMeta(page, limit, total) : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/** -------------------- RECHERCHE (mêmes query params) -------------------- */
export const searchPointVentes = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip, sort } = parsePagination(req);
    const filter = buildSearchFilter(req);
    const includeTotal = String(req.query.includeTotal ?? "true") !== "false";
    const includeStock = String(req.query.includeStock ?? "false") === "true";

    const query = PointVente.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("region");

    if (includeStock) query.populate("stock.produit");

    const [data, total] = await Promise.all([
      query.exec(),
      includeTotal ? PointVente.countDocuments(filter) : Promise.resolve(-1),
    ]);

    res.json({
      data,
      meta: includeTotal ? paginationMeta(page, limit, total) : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la recherche", error: err });
  }
};

/** -------------------- LISTE PAR RÉGION (compat) -------------------- */
export const getPointVentesByRegion = async (req: Request, res: Response) => {
  try {
    const { regionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(regionId)) {
      res.status(400).json({ message: "ID de région invalide" });
      return;
    }
    // On redirige vers la logique de liste avec filtre region
    // Supporte pagination/tri via querystring
    req.query.region = regionId;
    return getAllPointVentes(req, res);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/** -------------------- DÉTAIL -------------------- */
export const getPointVenteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeStock = String(req.query.includeStock ?? "true") === "true";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    let q = PointVente.findById(id).populate("region");
    if (includeStock) q = q.populate("stock.produit");

    const pv = await q.exec();

    if (!pv) {
      res.status(404).json({ message: "Point de vente non trouvé" });
      return;
    }

    const obj = pv.toObject();

    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/** -------------------- CRÉATION -------------------- */
export const createPointVente = async (req: Request, res: Response) => {
  try {
    const { nom, adresse, region } = req.body;
    const pointVente = new PointVente({ nom, adresse, region });
    await pointVente.save();
    await pointVente.populate("region");
    res.status(201).json(pointVente);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

/** -------------------- MISE À JOUR -------------------- */
export const updatePointVente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    const updateData = req.body;

    const updatedPointVente = await PointVente.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("region")
      .populate("stock.produit");

    if (!updatedPointVente) {
      res.status(404).json({ message: "Point de vente non trouvé" });
      return;
    }

    res.json(updatedPointVente);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/** -------------------- SUPPRESSION (cascade + fallback sans transaction) -------------------- */

async function cascadeDeletePointVente(pointVenteId: string, session?: ClientSession) {
  // 1) Vérifier existence
  const exists = await (session
    ? PointVente.findById(pointVenteId).session(session)
    : PointVente.findById(pointVenteId));
  if (!exists) return "NOT_FOUND" as const;

  // 2) Supprimer dépendances
  // - Produits rattachés à ce PV (si ton schéma Produit a un champ pointVente)
  await Produit?.deleteMany({ pointVente: pointVenteId }, { session }).catch(() => Promise.resolve());

  // - Ventes / Livraisons / Mouvements liés à ce PV (ajuste les noms de champs selon tes schémas)
  const pvMatch = [
    { pointVente: pointVenteId },
    { point_vente: pointVenteId },
    { pointDeVente: pointVenteId },
    { pos: pointVenteId },
  ];

 
  await MouvementStock?.deleteMany({ $or: pvMatch }, { session }).catch(() => Promise.resolve());

  // 3) Supprimer le point de vente
  if (session) {
    await PointVente.findByIdAndDelete(pointVenteId, { session });
  } else {
    await PointVente.findByIdAndDelete(pointVenteId);
  }

  return "DELETED" as const;
}

export const deletePointVente = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "ID invalide" });
    return;
  }

  const session = await mongoose.startSession();

  try {
    // Essai en transaction (si replica set actif)
    await session.withTransaction(async () => {
      const r = await cascadeDeletePointVente(id, session);
      if (r === "NOT_FOUND") throw { status: 404, message: "Point de vente non trouvé" };
    });

    res.json({ message: "Point de vente supprimé avec succès (cascade en transaction)" });
  } catch (err: any) {
    // Fallback si standalone (code 20)
    const isNoTxn =
      err?.code === 20 ||
      /Transaction numbers are only allowed/.test(String(err?.message));

    if (isNoTxn) {
      try {
        const r = await cascadeDeletePointVente(id); // sans session
        if (r === "NOT_FOUND") {
          res.status(404).json({ message: "Point de vente non trouvé" });
          return;
        }
        res.json({ message: "Point de vente supprimé avec succès (cascade sans transaction)" });
        return;
      } catch (e2: any) {
        res.status(500).json({
          message: "Erreur lors de la suppression (fallback)",
          error: e2?.message ?? e2,
        });
        return;
      }
    }

    const status = err?.status ?? 500;
    const message = err?.message ?? "Erreur interne lors de la suppression";
    res.status(status).json({ message, error: err });
  } finally {
    session.endSession();
  }
};
