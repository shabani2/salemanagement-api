import { Request, Response } from "express";
import { Produit } from "../Models/model"; // ton modèle mongoose

// 🔹 Obtenir tous les produits
export const getAllProduits = async (req: Request, res: Response) => {
  try {
    const produits = await Produit.find().populate("categorie");
    res.json(produits);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
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
    const { nom, categorie, prix, tva, prixVente } = req.body;

    const produit = new Produit({ nom, categorie, prix, tva, prixVente });
    await produit.save();
    res.status(201).json(produit);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

// 🔹 Mettre à jour un produit
export const updateProduit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nom, categorie, prix, tva } = req.body;

    const updatedProduit = await Produit.findByIdAndUpdate(
      id,
      { nom, categorie, prix, tva },
      { new: true },
    );

    if (!updatedProduit) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    res.json(updatedProduit);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Erreur lors de la mise à jour", error: err });
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
