import { Request, Response } from "express";
import { Categorie, Produit } from "../Models/model";
import fs from "fs";
import path from "path";
import { deleteFile, uploadFile } from "../services/uploadService";
import { MulterRequest } from "../Models/multerType";

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Categorie.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// controllers/categories.controller.ts

// Controllers/categorieController.ts
export const createCategorie = async (req: any, res: Response) => {
  try {
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Body keys:", Object.keys(req.body || {}));
    console.log("Body:", req.body);
    console.log(
      "Has file?",
      !!req.file,
      req.file?.fieldname,
      req.file?.mimetype,
      req.file?.size,
    );

    const { nom, type } = req.body; // doivent exister ici

    if (!nom || !type) {
      res.status(400).json({ message: "Champs manquants", body: req.body });
      return;
    }

    let imagePath = "";
    if (req.file) {
      imagePath = await uploadFile(req.file, "categorie");
    }

    const categorie = new Categorie({ nom, type, image: imagePath });
    await categorie.save();

    res.status(201).json(categorie);
  } catch (err) {
    console.error("Erreur création catégorie:", err);
    res
      .status(400)
      .json({ message: "Erreur lors de la création", error: String(err) });
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

export const updateCategorie = async (
  req: MulterRequest,
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

    // Si un nouveau fichier est uploadé
    if (req.file) {
      // Supprimer l'ancienne image si elle existe
      if (categorie.image) {
        try {
          await deleteFile(categorie.image);
        } catch (deleteErr) {
          console.warn("Impossible de supprimer l'ancienne image:", deleteErr);
        }
      }

      // Upload de la nouvelle image
      categorie.image = await uploadFile(req.file, "categorie");
    }

    // Mise à jour des champs
    if (nom !== undefined) categorie.nom = nom;
    if (type !== undefined) categorie.type = type;

    await categorie.save();
    res.json(categorie);
  } catch (err) {
    console.error("Erreur mise à jour catégorie:", err);
    res
      .status(500)
      .json({ message: "Erreur lors de la mise à jour", error: err });
  }
};
