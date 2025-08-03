// controllers/commandeController.ts

import { Request, Response } from "express";
import mongoose from "mongoose";
import { Commande, CommandeProduit, MouvementStock } from "../Models/model";

const getPaginationOptions = (req: Request) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const commonPopulate = [
  { path: "user", select: "-password" },
  { path: "region" },
  {
    path: "pointVente",
    populate: { path: "region", model: "Region" },
  },
];

const formatCommande = async (commande: any) => {
  await commande.populate({
    path: "produits",
    populate: {
      path: "produit",
      model: "Produit",
    },
  });

  let montant = 0;
  let nombreCommandeProduit = 0;
  let livrés = 0;

  commande.produits.forEach((cp: any) => {
    const prix = cp.produit?.prix ?? 0;
    const quantite = cp.quantite ?? 0;
    montant += prix * quantite;

    if (cp.statut === "livré") livrés += quantite;
  });
  nombreCommandeProduit += commande.produits.length;
  const tauxLivraison =
    nombreCommandeProduit > 0
      ? Math.round((livrés / nombreCommandeProduit) * 100)
      : 0;

  return {
    ...commande.toObject(),
    montant,
    nombreCommandeProduit,
    tauxLivraison,
  };
};

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
      });

    const total = await Commande.countDocuments();

    const formatted = await Promise.all(commandes.map(formatCommande));

    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération des commandes.",
      error: (error as Error).message,
    });
  }
};

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
      });

    const total = await Commande.countDocuments({ user: userId });

    const formatted = await Promise.all(commandes.map(formatCommande));

    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération des commandes utilisateur.",
      error: (error as Error).message,
    });
  }
};

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
      });

    const total = await Commande.countDocuments({ pointVente: pointVenteId });

    const formatted = await Promise.all(commandes.map(formatCommande));

    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res.status(400).json({
      message:
        "Erreur lors de la récupération des commandes par point de vente.",
      error: (error as Error).message,
    });
  }
};

export const getCommandesByRegion = async (req: Request, res: Response) => {
  try {
    const { regionId } = req.params;
    const { skip, limit } = getPaginationOptions(req);

    // 1. Récupérer toutes les commandes liées à cette région ou ayant un pointVente
    const commandes = await Commande.find({
      $or: [{ region: regionId }, { pointVente: { $ne: null } }],
    })
      .skip(skip)
      .limit(limit)
      .populate(commonPopulate);

    // 2. Filtrer en JS selon la condition réelle de correspondance
    const filtered = commandes.filter(
      (cmd) =>
        cmd.region?._id?.toString() === regionId ||
        (cmd.pointVente &&
          typeof cmd.pointVente === "object" &&
          "region" in cmd.pointVente &&
          (cmd.pointVente as any).region &&
          typeof (cmd.pointVente as any).region === "object" &&
          (cmd.pointVente as any).region._id?.toString() === regionId),
    );

    const formatted = await Promise.all(filtered.map(formatCommande));

    res.status(200).json({ total: filtered.length, commandes: formatted });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération des commandes par région.",
      error: (error as Error).message,
    });
  }
};

export const getCommandeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const commande = await Commande.findById(id)
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

    const formatted = await formatCommande(commande);

    res.status(200).json(formatted);
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération de la commande.",
      error: (error as Error).message,
    });
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

    // 1. Créer la commande (vide pour le moment)
    const numero = `CMD-${Date.now()}`;
    const commande = new Commande({
      numero,
      user,
      region,
      pointVente,
      depotCentral,
      produits: [], // vide au départ
      statut: "attente",
    });
    await commande.save();

    // 2. Créer les CommandeProduits avec l'ID de la commande
    const createdCommandeProduits = await Promise.all(
      produits.map(async (prod: any) => {
        const created = new CommandeProduit({
          commandeId: commande._id, // liaison ici
          produit: prod.produit,
          quantite: prod.quantite,
          uniteMesure: prod.uniteMesure,
          statut: "attente",
        });
        await created.save();
        return created._id;
      }),
    );

    // 3. Mise à jour de la commande avec les produits créés
    commande.produits = createdCommandeProduits;
    await commande.save();

    // 4. Renvoyer la commande peuplée
    const populated = await Commande.findById(commande._id)
      .populate("user", "-password")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate({
        path: "produits",
        populate: { path: "produit" },
      });

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({
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
    const { produits: produitsUpdates, ...updateData } = req.body;

    // 1. Mise à jour des champs de la commande (hors produits)
    const commande = await Commande.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!commande) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }

    // 2. Mise à jour des produits, si fournis
    if (Array.isArray(produitsUpdates) && produitsUpdates.length > 0) {
      // On boucle sur les produits mis à jour
      for (const prodUpdate of produitsUpdates) {
        const {
          _id: produitId,
          statut,
          quantite,
          mouvementStockId,
          ...rest
        } = prodUpdate;

        if (!produitId) {
          // On ignore ou on peut gérer erreur
          continue;
        }

        // Récupération du produit commande à mettre à jour
        const produitCommande = await CommandeProduit.findById(produitId);
        if (!produitCommande) {
          // Ignore ou collecter erreurs
          continue;
        }

        // Mise à jour des propriétés générales sauf statut (car trigger)
        for (const key in rest) {
          // @ts-ignore
          produitCommande[key] = rest[key];
        }

        // Gestion spéciale du statut
        if (statut && statut !== produitCommande.statut) {
          // Si passage au statut livré, on déclenche la création de mouvement stock
          if (statut === "livré") {
            // Si déjà livré, on skip
            if (produitCommande.statut === "livré") {
              // rien à faire
            } else {
              // Créer le mouvement stock lié
              const mouvementData: any = {
                produit: produitCommande.produit,
                quantite: quantite ?? produitCommande.quantite,
                montant: prodUpdate.montant ?? 0, // idéalement passé dans prodUpdate
                type: "Livraison",
                statut: true,
                user: updateData.user, // À adapter selon contexte
                commandeId: commande._id,
                depotCentral: updateData.depotCentral || false,
              };
              if (updateData.pointVente) {
                mouvementData.pointVente = updateData.pointVente;
              }
              if (updateData.region) {
                mouvementData.region = updateData.region;
              }

              const mouvement = new MouvementStock(mouvementData);
              await mouvement.save();

              produitCommande.mouvementStockId = mouvement._id;
              produitCommande.statut = "livré";
            }
          } else {
            // Si changement de statut autre que livré, on applique direct
            produitCommande.statut = statut;
          }
        }

        await produitCommande.save();
      }
    }

    // 3. Recharger tous les produits pour vérifier si tous sont livrés
    const produitsCommande = await CommandeProduit.find({
      commande: commande._id,
    });
    const tousLivrés = produitsCommande.every((p) => p.statut === "livré");

    if (tousLivrés && commande.statut !== "livrée") {
      commande.statut = "livrée";
      await commande.save();
    }

    // 4. Retourner la commande peuplée
    const populated = await Commande.findById(commande._id)
      .populate("user", "-password")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate({
        path: "produits",
        populate: { path: "produit" },
      });

    res.status(200).json(populated);
    return;
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la mise à jour de la commande.",
      error: (error as Error).message,
    });
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
    res.status(400).json({
      message: "Erreur lors de la suppression.",
      error: (error as Error).message,
    });
    return;
  }
};
