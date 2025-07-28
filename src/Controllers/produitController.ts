// controllers/produitController.ts
import { Request, Response } from "express";
import { Produit } from "../Models/model";

// 🔹 Obtenir tous les produits
export const getAllProduits = async (req: Request, res: Response) => {
  try {
    const produits = await Produit.find()
      .sort({ createdAt: -1 })
      .populate("categorie");
    res.json(produits);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};
export const searchProduit = async (req: Request, res: Response) => {
  const { q } = req.query; // q pour "query"

  try {
    const produits = await Produit.find({
      nom: { $regex: q, $options: 'i' }, // recherche insensible à la casse
    })
      .sort({ createdAt: -1 })
      .populate('categorie');

    res.json(produits);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la recherche', error: err });
  }
};
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
    const { nom, categorie, prix, tva, prixVente, marge, netTopay, unite, seuil } =
      req.body;

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
