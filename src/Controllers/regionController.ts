// controllers/regionController.ts
import { Request, Response } from "express";
import mongoose, { ClientSession } from "mongoose";
import { MouvementStock, PointVente, Region } from "../Models/model";

/** -------------------- Utils pagination/tri/filtre -------------------- */
const parsePagination = (req: Request) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10),
  );
  const skip = (page - 1) * limit;

  const sortBy = (req.query.sortBy as string) || "createdAt"; // "nom" | "ville" | "pointVenteCount" | ...
  const order =
    ((req.query.order as string) || "desc").toLowerCase() === "asc" ? 1 : -1;
  const sort = { [sortBy]: order as 1 | -1 };

  return { page, limit, skip, sort };
};

const buildSearchFilter = (req: Request) => {
  const q = (req.query.q as string) || "";
  const ville = (req.query.ville as string) || "";

  const filter: any = {};
  const $and: any[] = [];

  if (q) {
    $and.push({
      $or: [
        { nom: { $regex: q, $options: "i" } },
        { ville: { $regex: q, $options: "i" } },
      ],
    });
  }
  if (ville) {
    $and.push({ ville: { $regex: ville, $options: "i" } });
  }
  if ($and.length) filter.$and = $and;

  return filter;
};

const paginationMeta = (page: number, limit: number, total: number) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
};

/** -------------------- LISTE avec pagination/tri/filtres -------------------- */
export const getAllRegions = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip, sort } = parsePagination(req);
    const filter = buildSearchFilter(req);
    const includeTotal = String(req.query.includeTotal ?? "true") !== "false";

    // pipeline avec lookup + count de points de vente
    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: "pointventes", // ⚠️ nom de collection (minuscule/pluriel Mongo)
          localField: "_id",
          foreignField: "region",
          as: "pointsVente",
        },
      },
      { $addFields: { pointVenteCount: { $size: "$pointsVente" } } },
      { $project: { nom: 1, ville: 1, pointVenteCount: 1 } },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
    ];

    const [data, total] = await Promise.all([
      Region.aggregate(pipeline),
      includeTotal ? Region.countDocuments(filter) : Promise.resolve(-1),
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
export const searchRegions = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip, sort } = parsePagination(req);
    const filter = buildSearchFilter(req);
    const includeTotal = String(req.query.includeTotal ?? "true") !== "false";

    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: "pointventes",
          localField: "_id",
          foreignField: "region",
          as: "pointsVente",
        },
      },
      { $addFields: { pointVenteCount: { $size: "$pointsVente" } } },
      { $project: { nom: 1, ville: 1, pointVenteCount: 1 } },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
    ];

    const [data, total] = await Promise.all([
      Region.aggregate(pipeline),
      includeTotal ? Region.countDocuments(filter) : Promise.resolve(-1),
    ]);

    res.json({
      data,
      meta: includeTotal ? paginationMeta(page, limit, total) : undefined,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Erreur lors de la recherche", error: err });
  }
};

/** -------------------- DÉTAIL -------------------- */
export const getRegionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    const rows = await Region.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "pointventes",
          localField: "_id",
          foreignField: "region",
          as: "pointsVente",
        },
      },
      { $addFields: { pointVenteCount: { $size: "$pointsVente" } } },
      { $project: { nom: 1, ville: 1, pointVenteCount: 1 } },
    ]);

    const region = rows?.[0];
    if (!region) {
      res.status(404).json({ message: "Région non trouvée" });
      return;
    }
    res.json(region);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/** -------------------- CRÉATION -------------------- */
export const createRegion = async (req: Request, res: Response) => {
  try {
    const { nom, ville } = req.body;
    const region = new Region({ nom, ville });
    await region.save();
    res.status(201).json(region);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

/** -------------------- MISE À JOUR -------------------- */
export const updateRegion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    const { nom, ville } = req.body;
    const updated = await Region.findByIdAndUpdate(
      id,
      { nom, ville },
      { new: true, runValidators: true },
    );

    if (!updated) {
      res.status(404).json({ message: "Région non trouvée" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la mise à jour",
        error: err?.message ?? err,
      });
  }
};

/** -------------------- SUPPRESSION (cascade + fallback sans transaction) -------------------- */

async function cascadeDeleteRegion(regionId: string, session?: ClientSession) {
  // Vérifie existence
  const exists = await (session
    ? Region.findById(regionId).session(session)
    : Region.findById(regionId));
  if (!exists) return "NOT_FOUND" as const;

  // Récupère les points de vente de la région
  const pvs = await (session
    ? PointVente.find({ region: regionId }).select("_id").session(session)
    : PointVente.find({ region: regionId }).select("_id"));
  const pvIds = pvs.map((p: { _id: any }) => p._id);

  // Supprime dépendances liées aux PV (ajuste les champs selon tes schémas)
  const pvOrs = [
    { pointVente: { $in: pvIds } },
    { point_vente: { $in: pvIds } },
    { pointDeVente: { $in: pvIds } },
    { pos: { $in: pvIds } },
  ];

  await MouvementStock?.deleteMany({ $or: pvOrs }, { session }).catch(() =>
    Promise.resolve(),
  );

  // Supprime les points de vente
  await PointVente?.deleteMany({ region: regionId }, { session }).catch(() =>
    Promise.resolve(),
  );

  // Supprime la région
  if (session) {
    await Region.findByIdAndDelete(regionId, { session });
  } else {
    await Region.findByIdAndDelete(regionId);
  }

  return "DELETED" as const;
}

export const deleteRegion = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "ID invalide" });
    return;
  }

  const session = await mongoose.startSession();

  try {
    // Essai en transaction (si replica set actif)
    await session.withTransaction(async () => {
      const r = await cascadeDeleteRegion(id, session);
      if (r === "NOT_FOUND")
        throw { status: 404, message: "Région non trouvée" };
    });

    res.json({
      message: "Région supprimée avec succès (cascade en transaction)",
    });
  } catch (err: any) {
    // Fallback si standalone (code 20)
    const isNoTxn =
      err?.code === 20 ||
      /Transaction numbers are only allowed/.test(String(err?.message));

    if (isNoTxn) {
      try {
        const r = await cascadeDeleteRegion(id); // sans session
        if (r === "NOT_FOUND") {
          res.status(404).json({ message: "Région non trouvée" });
          return;
        }
        res.json({
          message: "Région supprimée avec succès (cascade sans transaction)",
        });
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
