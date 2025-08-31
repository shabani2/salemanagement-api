// controllers/produitController.ts
import { Request, Response } from "express";
import { Produit } from "../Models/model";

/**
 * GET /produits
 * Pagination + tri + filtres optionnels
 * Query:
 *  - page, limit
 *  - categorie (id)
 *  - minPrice, maxPrice (sur prixVente)
 *  - sortBy (ex: createdAt | nom | prixVente)
 *  - order (asc | desc)
 *  - includeTotal (true/false) : si false, on ne fait pas le countDocuments
 */
export const getAllProduits = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const order = (req.query.order as string) === "asc" ? 1 : -1;
    const includeTotal = (req.query.includeTotal ?? "true") === "true";

    const categorie = (req.query.categorie as string) || undefined;
    const minPrice =
      req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
    const maxPrice =
      req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;

    const filter: Record<string, any> = {};
    if (categorie) filter.categorie = categorie;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.prixVente = {};
      if (minPrice !== undefined) filter.prixVente.$gte = minPrice;
      if (maxPrice !== undefined) filter.prixVente.$lte = maxPrice;
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: order };

    const query = Produit.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("categorie");

    const [items, total] = await Promise.all([
      query.exec(),
      includeTotal ? Produit.countDocuments(filter) : Promise.resolve(0),
    ]);

    const totalPages = includeTotal ? Math.max(1, Math.ceil(total / limit)) : 1;

    res.json({
      data: items,
      meta: {
        page,
        limit,
        total: includeTotal ? total : items.length,
        totalPages,
        hasPrev: includeTotal ? page > 1 : false,
        hasNext: includeTotal ? page < totalPages : false,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/**
 * GET /produits/search
 * Recherche + pagination + tri
 * Query:
 *  - q (obligatoire)
 *  - page, limit
 *  - sortBy, order, includeTotal
 *  - (optionnel) categorie, minPrice, maxPrice si tu veux les garder en recherche aussi
 */
export const searchProduit = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q) {
      res.status(400).json({ message: "Paramètre 'q' requis" });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const order = (req.query.order as string) === "asc" ? 1 : -1;
    const includeTotal = (req.query.includeTotal ?? "true") === "true";

    // Si tu veux autoriser aussi ces filtres en recherche:
    const categorie = (req.query.categorie as string) || undefined;
    const minPrice =
      req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
    const maxPrice =
      req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;

    const filter: Record<string, any> = {
      nom: { $regex: q, $options: "i" },
    };
    if (categorie) filter.categorie = categorie;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.prixVente = {};
      if (minPrice !== undefined) filter.prixVente.$gte = minPrice;
      if (maxPrice !== undefined) filter.prixVente.$lte = maxPrice;
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: order };

    const query = Produit.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("categorie");

    const [items, total] = await Promise.all([
      query.exec(),
      includeTotal ? Produit.countDocuments(filter) : Promise.resolve(0),
    ]);

    const totalPages = includeTotal ? Math.max(1, Math.ceil(total / limit)) : 1;

    res.json({
      data: items,
      meta: {
        page,
        limit,
        total: includeTotal ? total : items.length,
        totalPages,
        hasPrev: includeTotal ? page > 1 : false,
        hasNext: includeTotal ? page < totalPages : false,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Erreur lors de la recherche", error: err });
  }
};

/** ---------- Le reste inchangé ---------- */

// 🔹 Obtenir un produit par ID
export const getProduitById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
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

    // Si tu utilises upload.single("image") côté route, tu peux gérer req.file ici si besoin

    await produit.save();
    res.status(201).json(produit);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

// 🔹 Mettre à jour un produit
export const updateProduit = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

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

// 🔹 Supprimer un produit
export const deleteProduit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Produit.findByIdAndDelete(id);
    res.json({ message: "Produit supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};
