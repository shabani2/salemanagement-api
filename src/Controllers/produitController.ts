// controllers/produitController.ts
import { Request, Response } from "express";
import mongoose, { ClientSession } from "mongoose";
import { CommandeProduit, MouvementStock, Produit } from "../Models/model";

// 👉 Si tes modèles sont dans d'autres fichiers, ajuste ces imports :


/** Utilitaires */
const parsePagination = (req: Request) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10),
  );
  const skip = (page - 1) * limit;

  // Tri simple: ?sortBy=createdAt&order=desc  (order: asc|desc)
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const order = ((req.query.order as string) || "desc").toLowerCase() === "asc" ? 1 : -1;
  const sort = { [sortBy]: order as 1 | -1 };

  return { page, limit, skip, sort };
};

const buildSearchFilter = (req: Request) => {
  const q = (req.query.q as string) || "";
  const categorie = (req.query.categorie as string) || "";
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;

  const filter: any = {};

  if (q) {
    filter.nom = { $regex: q, $options: "i" };
  }
  if (categorie && mongoose.Types.ObjectId.isValid(categorie)) {
    filter.categorie = new mongoose.Types.ObjectId(categorie);
  }
  if (minPrice != null || maxPrice != null) {
    filter.prixVente = {};
    if (minPrice != null) filter.prixVente.$gte = minPrice;
    if (maxPrice != null) filter.prixVente.$lte = maxPrice;
  }

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

// 🔹 Obtenir tous les produits (avec pagination / tri / filtres)
export const getAllProduits = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip, sort } = parsePagination(req);
    const filter = buildSearchFilter(req);

    // ?includeTotal=false pour ne pas calculer le total (perf)
    const includeTotal = String(req.query.includeTotal ?? "true") !== "false";

    const query = Produit.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("categorie");

    const [produits, total] = await Promise.all([
      query.exec(),
      includeTotal ? Produit.countDocuments(filter) : Promise.resolve(-1),
    ]);

    res.json({
      data: produits,
      meta: includeTotal ? paginationMeta(page, limit, total) : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Recherche (paginée) – garde aussi cet endpoint si tu l’utilises déjà côté front
export const searchProduit = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip, sort } = parsePagination(req);
    const filter = buildSearchFilter(req);

    const includeTotal = String(req.query.includeTotal ?? "true") !== "false";

    const query = Produit.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("categorie");

    const [produits, total] = await Promise.all([
      query.exec(),
      includeTotal ? Produit.countDocuments(filter) : Promise.resolve(-1),
    ]);

    res.json({
      data: produits,
      meta: includeTotal ? paginationMeta(page, limit, total) : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la recherche", error: err });
  }
};

// 🔹 Obtenir un produit par ID
export const getProduitById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    const produit = await Produit.findById(id).populate("categorie");

    if (!produit) {
      res.status(404).json({ message: "Produit non trouvé" });
      return;
    }

    res.json(produit);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Créer un produit
export const createProduit = async (req: Request, res: Response) => {
  try {
    const {
      nom,
      categorie,
      prix,
      tva,
      prixVente,
      marge,
      netTopay,
      unite,
      seuil,
    } = req.body;

    const produit = new Produit({
      nom,
      categorie,
      prix,
      tva,
      prixVente,
      marge,
      netTopay,
      unite,
      seuil,
    });

    await produit.save();
    await produit.populate("categorie");
    res.status(201).json(produit);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

// 🔹 Mettre à jour un produit
export const updateProduit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    const updateData: Partial<{
      nom: string;
      categorie: string;
      prix: number;
      tva: number;
      prixVente: number;
      marge: number;
      netTopay: number;
      unite: string;
      seuil: number;
    }> = req.body;

    const updatedProduit = await Produit.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("categorie");

    if (!updatedProduit) {
      res.status(404).json({ message: "Produit non trouvé" });
      return;
    }

    res.json(updatedProduit);
  } catch (err) {
    res.status(400).json({
      message: "Erreur lors de la mise à jour du produit",
      error: err instanceof Error ? err.message : err,
    });
  }
};

// 🔹 Supprimer un produit (CASCADE) dans une transaction
async function cascadeDeleteProduit(id: string, session?: ClientSession) {
  // 1) Vérifier que le produit existe
  const produit = await (session
    ? Produit.findById(id).session(session)
    : Produit.findById(id));
  if (!produit) return "NOT_FOUND" as const;

  // 2) Supprimer les dépendances connues
  //    Ajuste les noms de modèles/champs selon tes schémas
  await CommandeProduit?.deleteMany(
    { $or: [{ produit: id }, { produitId: id }] },
    { session }
  ).catch(() => Promise.resolve());

  await MouvementStock?.deleteMany({ produit: id }, { session }).catch(() =>
    Promise.resolve()
  );

  // 3) Supprimer le produit
  if (session) {
    await Produit.findByIdAndDelete(id, { session });
  } else {
    await Produit.findByIdAndDelete(id);
  }

  return "DELETED" as const;
}

export const deleteProduit = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "ID invalide" });
    return;
  }

  const session = await mongoose.startSession();

  try {
    // --- 1) Essai avec transaction (si replica set/mongos présent) ---
    await session.withTransaction(async () => {
      const r = await cascadeDeleteProduit(id, session);
      if (r === "NOT_FOUND") throw { status: 404, message: "Produit non trouvé" };
    });

    res.json({ message: "Produit supprimé avec succès (cascade en transaction)" });
  } catch (err: any) {
    // --- 2) Fallback si transactions non supportées ---
    const isNoTxn =
      err?.code === 20 ||
      /Transaction numbers are only allowed/.test(String(err?.message));

    if (isNoTxn) {
      try {
        const r = await cascadeDeleteProduit(id); // sans session/transaction
        if (r === "NOT_FOUND") {
          res.status(404).json({ message: "Produit non trouvé" });
          return;
        }
        res.json({ message: "Produit supprimé avec succès (cascade sans transaction)" });
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
