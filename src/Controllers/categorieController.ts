import { Request, Response } from "express";
import { Categorie, Produit } from "../Models/model";
import fs from "fs";
import path from "path";

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Categorie.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const createCategorie = async (req: Request, res: Response) => {
  try {
    const { nom, type } = req.body;
    let imagePath = "";
    const categorieDir = path.join(__dirname, "./../assets/categorie");

    // Vérifier et créer le dossier si nécessaire
    if (!fs.existsSync(categorieDir)) {
      fs.mkdirSync(categorieDir, { recursive: true });
    }

    if (req.file) {
      imagePath = `../assets/categorie/${req.file.filename}`;
      const destinationPath = path.join(categorieDir, req.file.filename);

      // Déplacer le fichier vers le bon dossier (optionnel si Multer gère déjà ça)
      fs.renameSync(req.file.path, destinationPath);
    }
    const categorie = new Categorie({ nom, type, image: imagePath });
    await categorie.save();
    res.status(201).json(categorie);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

export const deleteCategorie = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Produit.deleteMany({ categorie: id });
    await Categorie.findByIdAndDelete(id);
    res.json({ message: "Catégorie et ses produits supprimés avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const getCategorieById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const categorie = await Categorie.findById(id);
    if (!categorie) {
      res.status(404).json({ message: "Catégorie non trouvée" });
      return;
    }
    res.json(categorie);
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};
