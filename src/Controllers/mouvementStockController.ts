// controllers/mvtStockController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { MouvementStock } from "../Models/model"; // adapte le chemin si besoin
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import frLocale, { fr } from "date-fns/locale"; //

type Order = "asc" | "desc";

type Period = "jour" | "semaine" | "mois" | "annee" | "tout";

const parseDateRange = (q: any) => {
  // priorité aux paramètres explicites dateFrom/dateTo
  const df = q.dateFrom ? new Date(String(q.dateFrom)) : null;
  const dt = q.dateTo ? new Date(String(q.dateTo)) : null;
  if (df && !isNaN(df.getTime()) && dt && !isNaN(dt.getTime())) {
    return { $gte: df, $lte: dt };
  }

  // sinon on accepte period (+ month + year)
  const period = (q.period as Period) ?? "tout";
  const now = new Date();

  if (period === "jour") {
    return { $gte: startOfDay(now), $lte: endOfDay(now) };
  }
  if (period === "semaine") {
    // semaine courante (lundi-dimanche)
    const so = startOfWeek(now, { weekStartsOn: 1, locale: fr });
    const eo = endOfWeek(now, { weekStartsOn: 1, locale: fr });
    return { $gte: so, $lte: eo };
  }
  if (period === "mois") {
    const y = Number(q.year ?? now.getFullYear());
    const m0 = Math.max(0, Math.min(11, Number(q.month ?? now.getMonth()))); // 0..11
    return {
      $gte: startOfMonth(new Date(y, m0, 1)),
      $lte: endOfMonth(new Date(y, m0, 1)),
    };
  }
  if (period === "annee") {
    const y = Number(q.year ?? now.getFullYear());
    return {
      $gte: startOfYear(new Date(y, 0, 1)),
      $lte: endOfYear(new Date(y, 0, 1)),
    };
  }

  return null; // 'tout' → pas de filtre temps
};

const buildFilter = (query: any) => {
  const f: any = {};
  if (query.type && query.type !== "Tout") f.type = String(query.type);

  if (query.pointVente && mongoose.Types.ObjectId.isValid(query.pointVente)) {
    f.pointVente = new mongoose.Types.ObjectId(query.pointVente);
  }
  if (query.region && mongoose.Types.ObjectId.isValid(query.region)) {
    f.region = new mongoose.Types.ObjectId(query.region);
  }

  // 🔥 filtre temps (createdAt)
  const createdAtRange = parseDateRange(query);
  if (createdAtRange) f.createdAt = createdAtRange;

  // Ajoute d’autres filtres si besoin (produit, user, statut…)
  return f;
};

/* ============================== Helpers ============================== */

const toInt = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const like = (q?: string) =>
  q && q.trim()
    ? {
        $or: [{ type: { $regex: q, $options: "i" } }],
      }
    : {};

// const buildFilter = (query: any) => {
//   const f: any = {};
//   if (query.type && query.type !== 'Tout') f.type = String(query.type);

//   if (query.pointVente && mongoose.Types.ObjectId.isValid(query.pointVente)) {
//     f.pointVente = new mongoose.Types.ObjectId(query.pointVente);
//   }
//   if (query.region && mongoose.Types.ObjectId.isValid(query.region)) {
//     f.region = new mongoose.Types.ObjectId(query.region);
//   }
//   // Ajoute ici au besoin : produit, user, statut, dateFrom/dateTo, etc.
//   return f;
// };

// Champs triables (champs DIRECTS du modèle)
const ALLOWED_SORTS = new Set([
  "createdAt",
  "updatedAt",
  "type",
  "quantite",
  "montant",
  "statut",
]);

/**
 * Pagination tolérante :
 * - si first/offset est fourni => offset-based
 * - sinon page 0-based -> skip = page*limit
 */
const parsePaging = (req: Request) => {
  const limit = Math.max(1, toInt(req.query.limit, 10));
  if (req.query.first !== undefined || req.query.offset !== undefined) {
    const first = Math.max(0, toInt(req.query.first ?? req.query.offset, 0));
    return { limit, skip: first, first };
  }
  const page = Math.max(0, toInt(req.query.page, 0));
  const skip = page * limit;
  return { limit, skip, first: skip };
};

/* ============================== Controllers ============================== */

/**
 * GET /mouvements
 * Query:
 *  - first/limit (offset-based) OU page/limit (0-based)
 *  - sortBy/order
 *  - q + filtres (type, region, pointVente, ...)
 *  - includeTotal, includeRefs
 */
export const listMouvementsStock = async (req: Request, res: Response) => {
  try {
    const { limit, skip, first } = parsePaging(req);
    const rawSortBy = (req.query.sortBy as string) || "createdAt";
    const order: Order = (req.query.order as Order) === "asc" ? "asc" : "desc";
    const includeTotal = String(req.query.includeTotal || "true") === "true";
    const includeRefs = String(req.query.includeRefs || "true") === "true";
    const q = (req.query.q as string) || "";

    // Normalisation du tri : pas de champs "dotés" (ex. produit.nom)
    const sortBy = ALLOWED_SORTS.has(rawSortBy) ? rawSortBy : "createdAt";
    const sort: Record<string, 1 | -1> = {
      [sortBy]: order === "asc" ? 1 : -1,
      _id: order === "asc" ? 1 : -1, // tri secondaire stable
    };

    const filter = {
      ...buildFilter(req.query),
      ...like(q),
    };

    let cursor = MouvementStock.find(filter).sort(sort).skip(skip).limit(limit);

    if (includeRefs) {
      cursor = cursor
        .populate({
          path: "produit",
          populate: { path: "categorie", model: "Categorie" },
        })
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate("region")
        .populate({ path: "user", select: "-password" });
    }

    const [items, total] = await Promise.all([
      cursor.exec(),
      includeTotal
        ? MouvementStock.countDocuments(filter)
        : Promise.resolve(undefined),
    ]);

    res.json({
      data: items,
      meta: {
        first, // offset courant
        limit,
        total: total ?? items.length,
        sortBy,
        order,
        q,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Erreur interne lors de la récupération des mouvements.",
      error: (err as Error).message,
    });
  }
};

/**
 * GET /mouvements/:id
 */
export const getMouvementById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    const doc = await MouvementStock.findById(id)
      .populate({
        path: "produit",
        populate: { path: "categorie", model: "Categorie" },
      })
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate("region")
      .populate({ path: "user", select: "-password" });

    if (!doc) {
      res.status(404).json({ message: "Mouvement non trouvé" });
      return;
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({
      message: "Erreur interne lors de la récupération du mouvement.",
      error: (err as Error).message,
    });
  }
};

/**
 * POST /mouvements
 * -> utilise .save() => déclenche bien pre('save') / post('save')
 */
export const createMouvementStock = async (req: Request, res: Response) => {
  try {
    const {
      produit,
      quantite,
      montant,
      type,
      user,
      pointVente,
      region,
      depotCentral,
      statut,
    } = req.body;

    if (!produit || !quantite || !type || !user) {
      res
        .status(400)
        .json({
          message: "Champs requis manquants (produit, quantite, type, user).",
        });
      return;
    }

    const mouvement = new MouvementStock({
      produit,
      quantite,
      montant: montant ?? 0,
      type,
      user,
      pointVente: pointVente || undefined,
      region: region || undefined,
      depotCentral: !!depotCentral,
      ...(typeof statut === "boolean" ? { statut } : {}),
    });

    // ⇩⇩⇩ TRIGGER pre/post('save')
    await mouvement.save();

    const populated = await MouvementStock.findById(mouvement._id)
      .populate({
        path: "produit",
        populate: { path: "categorie", model: "Categorie" },
      })
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate("region")
      .populate({ path: "user", select: "-password" });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({
      message: "Erreur lors de la création du mouvement.",
      error: (err as Error).message,
    });
  }
};

/**
 * PUT /mouvements/:id
 * -> **NE PAS** utiliser findByIdAndUpdate si l’on veut déclencher les hooks save.
 *    On charge le doc, on set(), puis doc.save()
 */
export const updateMouvementStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    const doc = await MouvementStock.findById(id);
    if (!doc) {
      res.status(404).json({ message: "Mouvement non trouvé" });
      return;
    }

    // Mettre à jour les champs autorisés
    const payload = req.body ?? {};
    doc.set(payload);

    // ⇩⇩⇩ TRIGGER pre/post('save')
    await doc.save();

    // Re-populer pour la réponse
    await doc.populate([
      { path: "produit", populate: { path: "categorie", model: "Categorie" } },
      { path: "pointVente", populate: { path: "region", model: "Region" } },
      { path: "region" },
      { path: "user", select: "-password" },
    ]);

    res.json(doc);
  } catch (err) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour du mouvement.",
      error: (err as Error).message,
    });
  }
};

/**
 * DELETE /mouvements/:id
 * (tes hooks sont sur save, donc pas d’impact ici)
 */
export const deleteMouvementStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    const deleted = await MouvementStock.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: "Mouvement non trouvé" });
      return;
    }

    res.json({ message: "Mouvement supprimé avec succès" });
  } catch (err) {
    res.status(500).json({
      message: "Erreur lors de la suppression du mouvement.",
      error: (err as Error).message,
    });
  }
};

/**
 * PATCH /mouvements/:id/validate
 * -> idem : on charge, on modifie, on save() pour déclencher les hooks
 */
export const validateMouvementStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    const doc = await MouvementStock.findById(id);
    if (!doc) {
      res.status(404).json({ message: "Mouvement non trouvé" });
      return;
    }

    doc.statut = true;

    // ⇩⇩⇩ TRIGGER pre/post('save')
    await doc.save();

    await doc.populate([
      { path: "produit", populate: { path: "categorie", model: "Categorie" } },
      { path: "pointVente", populate: { path: "region", model: "Region" } },
      { path: "region" },
      { path: "user", select: "-password" },
    ]);

    res.json({ success: true, mouvement: doc });
  } catch (err) {
    res.status(500).json({
      message: "Erreur lors de la validation du mouvement.",
      error: (err as Error).message,
    });
  }
};
