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

export const updateCategorie = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nom, type } = req.body;

    const categorie = await Categorie.findById(id);
    if (!categorie) {
      res.status(404).json({ message: "Catégorie non trouvée" });
      return;
    }

    // Si un nouveau fichier est uploadé, on gère l’upload et on supprime l’ancienne image
    if (req.file) {
      const categorieDir = path.join(__dirname, "./../assets/categorie");
      if (!fs.existsSync(categorieDir))
        fs.mkdirSync(categorieDir, { recursive: true });

      const newImagePath = `../assets/categorie/${req.file.filename}`;
      fs.renameSync(req.file.path, path.join(categorieDir, req.file.filename));

      if (categorie.image) {
        const oldImageFullPath = path.join(__dirname, "..", categorie.image);
        if (fs.existsSync(oldImageFullPath)) fs.unlinkSync(oldImageFullPath);
      }
      categorie.image = newImagePath;
    }

    // Mise à jour des champs
    if (nom !== undefined) categorie.nom = nom;
    if (type !== undefined) categorie.type = type;

    await categorie.save();
    res.json(categorie);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Erreur lors de la mise à jour", error: err });
  }
};
