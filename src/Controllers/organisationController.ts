import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { Organisations } from "../Models/model";
import { uploadFile, deleteFile } from "../services/uploadService";
import { MulterFile, MulterRequest } from "../Models/multerType";

// 🔹 Obtenir toutes les organisations
export const getAllOrganisations = async (req: Request, res: Response) => {
  try {
    const organisations = await Organisations.find().populate("superAdmin");
    res.json(organisations);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Obtenir une organisation par ID
export const getOrganisationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organisation =
      await Organisations.findById(id).populate("superAdmin");

    if (!organisation) {
      res.status(404).json({ message: "Organisation non trouvée" });
      return;
    }

    res.json(organisation);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Créer une organisation avec upload de logo
export const createOrganisation = async (req: MulterRequest, res: Response) => {
  try {
    const {
      nom,
      idNat,
      contact,
      numeroImpot,
      devise,
      superAdmin,
      pays,
      emailEntreprise,
    } = req.body;

    let logoUrl = "";

    // Upload du logo si présent
    if (req.file) {
      try {
        logoUrl = await uploadFile(req.file, "organisations");
      } catch (uploadError) {
        console.error("Erreur d'upload du logo:", uploadError);
        res.status(500).json({ message: "Échec de l'upload du logo" });
        return;
      }
    }

    const organisation = new Organisations({
      nom,
      idNat,
      contact,
      numeroImpot,
      logo: logoUrl, // Utilisez l'URL ou le chemin retourné
      devise,
      superAdmin,
      pays,
      emailEntreprise,
    });

    await organisation.save();
    res.status(201).json(organisation);
    return;
  } catch (err) {
    console.error("Erreur création organisation:", err);
    res.status(400).json({
      message: "Erreur lors de la création",
      error: err instanceof Error ? err.message : err,
    });
  }
};

// 🔹 Mettre à jour une organisation
export const updateOrganisation = async (req: MulterRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Traitement du logo si fourni
    if (req.file) {
      try {
        const logoUrl = await uploadFile(req.file, "organisations");
        updateData.logo = logoUrl;

        // Optionnel: Supprimer l'ancien logo
        const oldOrg = await Organisations.findById(id);
        if (oldOrg?.logo && process.env.NODE_ENV !== "development") {
          // Implémentez une fonction deleteFile si nécessaire
          await deleteFile(oldOrg.logo);
        }
      } catch (uploadError) {
        console.error("Erreur d'upload du logo:", uploadError);
        res.status(500).json({ message: "Échec de l'update du logo" });
        return;
      }
    }

    const updated = await Organisations.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("superAdmin");

    if (!updated) {
      res.status(404).json({ message: "Organisation non trouvée" });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error("Erreur update organisation:", err);
    res.status(400).json({
      message: "Erreur de mise à jour",
      error: err instanceof Error ? err.message : err,
    });
  }
};

// 🔹 Supprimer une organisation
export const deleteOrganisation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Organisations.findByIdAndDelete(id);
    res.json({ message: "Organisation supprimée" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Récupérer le logo de la première organisation
export const getDefaultOrganisationLogo = async (
  req: Request,
  res: Response,
) => {
  try {
    const organisation = await Organisations.findOne().sort({ _id: 1 });

    if (!organisation) {
      res.status(404).json({ message: "Aucune organisation trouvée" });
      return;
    }

    if (!organisation.logo) {
      res
        .status(404)
        .json({ message: "Aucun logo défini pour cette organisation" });
      return;
    }

    const filename = path.basename(organisation.logo);
    const publicPath = `/assets/organisations/${filename}`;

    res.json({ logoUrl: publicPath });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};
