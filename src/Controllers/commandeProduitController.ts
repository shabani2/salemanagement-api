// controllers/commandeProduitController.ts

import { Request, Response } from "express";
import mongoose from "mongoose";
import { Commande, CommandeProduit } from "../Models/model";

export const getCommandeProduitsByUser = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = req.params;

    const commandes = await Commande.find({ user: userId });

    const commandeIds = commandes.map((cmd) => cmd._id);

    const produits = await CommandeProduit.find({
      commandeId: { $in: commandeIds },
    })
      .populate({
        path: "produit",
        populate: { path: "categorie", model: "Categorie" },
      })
      .populate("commandeId")
      .populate({
        path: "commandeId",
        populate: {
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        },
      })
      .populate({
        path: "commandeId",
        populate: { path: "user", select: "-password" },
      })
      .populate("commandeId.region");

    res.status(200).json(produits);
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération des produits par utilisateur.",
      error: (error as Error).message,
    });
  }
};

export const getCommandeProduitsByPointVente = async (
  req: Request,
  res: Response,
) => {
  try {
    const { pointVenteId } = req.params;

    const commandes = await Commande.find({ pointVente: pointVenteId });

    const commandeIds = commandes.map((cmd) => cmd._id);

    const produits = await CommandeProduit.find({
      commandeId: { $in: commandeIds },
    })
      .populate({
        path: "produit",
        populate: { path: "categorie", model: "Categorie" },
      })
      .populate({
        path: "commandeId",
        populate: [
          { path: "user", select: "-password" },
          { path: "region" },
          {
            path: "pointVente",
            populate: { path: "region", model: "Region" },
          },
        ],
      });

    res.status(200).json(produits);
  } catch (error) {
    res.status(400).json({
      message:
        "Erreur lors de la récupération des produits par point de vente.",
      error: (error as Error).message,
    });
  }
};

export const getCommandeProduitsByRegion = async (
  req: Request,
  res: Response,
) => {
  try {
    const { regionId } = req.params;

    const commandes = await Commande.find({ region: regionId });

    const commandeIds = commandes.map((cmd) => cmd._id);

    const produits = await CommandeProduit.find({
      commandeId: { $in: commandeIds },
    })
      .populate({
        path: "produit",
        populate: { path: "categorie", model: "Categorie" },
      })
      .populate({
        path: "commandeId",
        populate: [
          { path: "user", select: "-password" },
          { path: "region" },
          {
            path: "pointVente",
            populate: { path: "region", model: "Region" },
          },
        ],
      });

    res.status(200).json(produits);
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération des produits par région.",
      error: (error as Error).message,
    });
  }
};

export const getCommandeById = async (req: Request, res: Response) => {
  try {
    const { commandeId } = req.params;

    const commande = await Commande.findById(commandeId)
      .populate("user", "-password")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      });

    if (!commande) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }

    const produits = await CommandeProduit.find({ commandeId }).populate({
      path: "produit",
      populate: { path: "categorie", model: "Categorie" },
    });

    res.status(200).json({ commande, produits });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération de la commande.",
      error: (error as Error).message,
    });
  }
};

export const createCommande = async (req: Request, res: Response) => {
  try {
    const { user, pointVente, region, depotCentral, produits } = req.body;

    if (
      !user ||
      !produits ||
      !Array.isArray(produits) ||
      produits.length === 0
    ) {
      res.status(400).json({ message: "Utilisateur et produits sont requis." });
    }

    if (!pointVente && !region && !depotCentral) {
      res
        .status(400)
        .json({ message: "La commande doit être liée à une localisation." });
    }

    const numero = `CMD-${Date.now()}`;

    const commande = await new Commande({
      numero,
      user,
      pointVente,
      region,
      depotCentral: !!depotCentral,
      statut: "attente",
    }).save();

    interface ProduitInput {
      produit: string;
      quantite: number;
    }

    interface CommandeProduitInsert {
      commandeId: mongoose.Types.ObjectId;
      produit: mongoose.Types.ObjectId;
      quantite: number;
      statut: string;
    }

    const produitsInput: ProduitInput[] = produits as ProduitInput[];

    const commandeProduits: CommandeProduitInsert[] =
      await CommandeProduit.insertMany(
        produitsInput.map(
          (p: ProduitInput): CommandeProduitInsert => ({
            commandeId: commande._id,
            produit: new mongoose.Types.ObjectId(p.produit),
            quantite: p.quantite,
            statut: "attente",
          }),
        ),
      );

    const fullCommande = await Commande.findById(commande._id)
      .populate("user", "-password")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      });

    res
      .status(201)
      .json({ commande: fullCommande, produits: commandeProduits });
    return;
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la création.",
      error: (error as Error).message,
    });
  }
};

export const deleteCommande = async (req: Request, res: Response) => {
  try {
    const { commandeId } = req.params;

    const deleted = await Commande.findByIdAndDelete(commandeId);
    if (!deleted) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }

    await CommandeProduit.deleteMany({ commandeId });

    res
      .status(200)
      .json({ message: "Commande et produits supprimés avec succès." });
    return;
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la suppression.",
      error: (error as Error).message,
    });
  }
};

// PUT /commande-produits/:id
export const updateCommandeProduit = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { produit, quantite, statut, mouvementStockId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "ID invalide" });
    return;
  }

  try {
    const updated = await CommandeProduit.findByIdAndUpdate(
      id,
      {
        ...(produit && { produit }),
        ...(quantite !== undefined && { quantite }),
        ...(statut && { statut }),
        ...(mouvementStockId !== undefined && { mouvementStockId }),
      },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ message: "CommandeProduit non trouvé" });
      return;
    }

    res.status(200).json(updated);
    return;
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour", error });
    return;
  }
};

/**
 * DELETE /commande-produits/:commandeId
 */
