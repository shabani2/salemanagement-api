// controllers/commandeController.ts

import { Request, Response } from "express";
import mongoose from "mongoose";
import { Commande } from "../Models/model";

const getPaginationOptions = (req: Request) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * GET /commandes
 */
export const getAllCommandes = async (req: Request, res: Response) => {
  try {
    const { skip, limit } = getPaginationOptions(req);

    const commandes = await Commande.find()
      .skip(skip)
      .limit(limit)
      .populate("user", "-password")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate({
        path: "produits.produit",
        populate: { path: "categorie", model: "Categorie" },
      });

    const total = await Commande.countDocuments();

    res.status(200).json({ commandes, total });
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la récupération des commandes.",
        error: (error as Error).message,
      });
  }
};

/**
 * GET /commandes/by-user/:userId
 */
export const getCommandesByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { skip, limit } = getPaginationOptions(req);

    const commandes = await Commande.find({ user: userId })
      .skip(skip)
      .limit(limit)
      .populate("user", "-password")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate({
        path: "produits.produit",
        populate: { path: "categorie", model: "Categorie" },
      });

    const total = await Commande.countDocuments({ user: userId });

    res.status(200).json({ commandes, total });
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la récupération des commandes utilisateur.",
        error: (error as Error).message,
      });
  }
};

/**
 * GET /commandes/by-pointvente/:pointVenteId
 */
export const getCommandesByPointVente = async (req: Request, res: Response) => {
  try {
    const { pointVenteId } = req.params;
    const { skip, limit } = getPaginationOptions(req);

    const commandes = await Commande.find({ pointVente: pointVenteId })
      .skip(skip)
      .limit(limit)
      .populate("user", "-password")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate({
        path: "produits.produit",
        populate: { path: "categorie", model: "Categorie" },
      });

    const total = await Commande.countDocuments({ pointVente: pointVenteId });

    res.status(200).json({ commandes, total });
  } catch (error) {
    res
      .status(400)
      .json({
        message:
          "Erreur lors de la récupération des commandes par point de vente.",
        error: (error as Error).message,
      });
  }
};

/**
 * GET /commandes/by-region/:regionId
 */
export const getCommandesByRegion = async (req: Request, res: Response) => {
  try {
    const { regionId } = req.params;
    const { skip, limit } = getPaginationOptions(req);

    const commandes = await Commande.find({ region: regionId })
      .skip(skip)
      .limit(limit)
      .populate("user", "-password")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate({
        path: "produits.produit",
        populate: { path: "categorie", model: "Categorie" },
      });

    const total = await Commande.countDocuments({ region: regionId });

    res.status(200).json({ commandes, total });
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la récupération des commandes par région.",
        error: (error as Error).message,
      });
  }
};

/**
 * GET /commandes/:id
 */
export const getCommandeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const commande = await Commande.findById(id)
      .populate("user", "-password")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate({
        path: "produits.produit",
        populate: { path: "categorie", model: "Categorie" },
      });

    if (!commande) res.status(404).json({ message: "Commande non trouvée." });

    res.status(200).json(commande);
    return;
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la récupération de la commande.",
        error: (error as Error).message,
      });
    return;
  }
};

/**
 * POST /commandes
 */
export const createCommande = async (req: Request, res: Response) => {
  try {
    const { user, region, pointVente, depotCentral, produits } = req.body;

    if (!user || !produits || produits.length === 0) {
      res
        .status(400)
        .json({ message: "L'utilisateur et les produits sont requis." });
      return;
    }

    const hasPointVente = !!pointVente;
    const hasRegion = !!region;
    const hasDepotCentral = depotCentral === true;

    if (!hasPointVente && !hasRegion && !hasDepotCentral) {
      res
        .status(400)
        .json({ message: "La commande doit être liée à une localisation." });
      return;
    }

    const numero = `CMD-${Date.now()}`;

    const commande = new Commande({
      numero,
      user,
      region,
      pointVente,
      depotCentral,
      produits,
      statut: "attente",
    });

    await commande.save();

    const populated = await Commande.findById(commande._id)
      .populate("user", "-password")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate({
        path: "produits.produit",
        populate: { path: "categorie", model: "Categorie" },
      });

    res.status(201).json(populated);
    return;
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la création de la commande.",
        error: (error as Error).message,
      });
  }
};

/**
 * PUT /commandes/:id
 */
export const updateCommande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await Commande.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("user", "-password")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate({
        path: "produits.produit",
        populate: { path: "categorie", model: "Categorie" },
      });

    if (!updated) res.status(404).json({ message: "Commande non trouvée." });

    res.status(200).json(updated);
    return;
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la mise à jour.",
        error: (error as Error).message,
      });
    return;
  }
};

/**
 * DELETE /commandes/:id
 */
export const deleteCommande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await Commande.findByIdAndDelete(id);
    if (!deleted) res.status(404).json({ message: "Commande non trouvée." });

    res.status(200).json({ message: "Commande supprimée avec succès." });
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la suppression.",
        error: (error as Error).message,
      });
    return;
  }
};
