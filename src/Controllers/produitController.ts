import { Request, Response } from "express";
import { Produit } from "../Models/model";

export const getAllProduits = async (req: Request, res: Response) => {
  try {
    const produits = await Produit.find().populate("categorie");
    res.json(produits);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const createProduit = async (req: Request, res: Response) => {
  try {
    const { nom, categorie, prix, stock } = req.body;
    //let imagePath = '';
    // if (req.file) {
    //   imagePath = `/assets/produits/${req.file.filename}`;
    // }
    const produit = new Produit({ nom, categorie, prix, stock });
    await produit.save();
    res.status(201).json(produit);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

export const deleteProduit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Produit.findByIdAndDelete(id);
    res.json({ message: "Produit supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const getProduitById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const produit = await Produit.findById(id).populate("categorie");
    if (!produit) {
      res.status(404).json({ message: "Produit non trouvé" });
      return;
    }
    res.json(produit);
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};
