// controllers/commandeProduitController.ts

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Commande } from '../Models/model';


/**
 * GET /commande-produits/by-user/:userId
 */
export const getCommandeProduitsByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const commandes = await Commande.find({ user: userId })
      .populate('user', '-password')
      .populate('region')
      .populate({
        path: 'pointVente',
        populate: { path: 'region', model: 'Region' }
      })
      .populate({
        path: 'produits.produit',
        populate: { path: 'categorie', model: 'Categorie' }
      });

    res.status(200).json(commandes);
  } catch (error) {
    res.status(400).json({
      message: 'Erreur lors de la récupération des commandes par utilisateur.',
      error: (error as Error).message,
    });
  }
};

/**
 * GET /commande-produits/by-pointvente/:pointVenteId
 */
export const getCommandeProduitsByPointVente = async (req: Request, res: Response) => {
  try {
    const { pointVenteId } = req.params;

    const commandes = await Commande.find({ pointVente: pointVenteId })
      .populate('user', '-password')
      .populate('region')
      .populate({
        path: 'pointVente',
        populate: { path: 'region', model: 'Region' }
      })
      .populate({
        path: 'produits.produit',
        populate: { path: 'categorie', model: 'Categorie' }
      });

    res.status(200).json(commandes);
  } catch (error) {
    res.status(400).json({
      message: 'Erreur lors de la récupération des commandes par point de vente.',
      error: (error as Error).message,
    });
  }
};

/**
 * GET /commande-produits/by-region/:regionId
 */
export const getCommandeProduitsByRegion = async (req: Request, res: Response) => {
  try {
    const { regionId } = req.params;

    const commandes = await Commande.find({ region: regionId })
      .populate('user', '-password')
      .populate('region')
      .populate({
        path: 'pointVente',
        populate: { path: 'region', model: 'Region' }
      })
      .populate({
        path: 'produits.produit',
        populate: { path: 'categorie', model: 'Categorie' }
      });

    res.status(200).json(commandes);
  } catch (error) {
    res.status(400).json({
      message: 'Erreur lors de la récupération des commandes par région.',
      error: (error as Error).message,
    });
  }
};

/**
 * GET /commande-produits/:commandeId
 */
export const getCommandeById = async (req: Request, res: Response) => {
  try {
    const { commandeId } = req.params;

    const commande = await Commande.findById(commandeId)
      .populate('user', '-password')
      .populate('region')
      .populate({
        path: 'pointVente',
        populate: { path: 'region', model: 'Region' }
      })
      .populate({
        path: 'produits.produit',
        populate: { path: 'categorie', model: 'Categorie' }
      });

    if (!commande) {
      res.status(404).json({ message: 'Commande non trouvée.' });
      return;
    }

    res.status(200).json(commande);
  } catch (error) {
    res.status(400).json({
      message: 'Erreur lors de la récupération de la commande.',
      error: (error as Error).message,
    });
  }
};

/**
 * POST /commande-produits
 */
export const createCommande = async (req: Request, res: Response) => {
  try {
    const { user, pointVente, region, depotCentral, produits } = req.body;

    if (!user || !produits || !Array.isArray(produits) || produits.length === 0) {
      res.status(400).json({ message: 'Utilisateur et produits sont requis.' });
      return;
    }

    const hasPointVente = !!pointVente;
    const hasRegion = !!region;
    const hasDepotCentral = depotCentral === true;

    if (!hasPointVente && !hasRegion && !hasDepotCentral) {
      res.status(400).json({ message: 'La commande doit être liée à une localisation.' });
      return;
    }

    const commandeProduits = produits.map(p => ({
      produit: new mongoose.Types.ObjectId(p.produit),
      quantite: p.quantite,
      statut: 'attente'
    }));

    const numero = `CMD-${Date.now()}`;

    const commande = new Commande({
      numero,
      user,
      pointVente,
      region,
      depotCentral: !!depotCentral,
      produits: commandeProduits,
      statut: 'attente'
    });

    await commande.save();

    const populated = await Commande.findById(commande._id)
      .populate('user', '-password')
      .populate('region')
      .populate({ path: 'pointVente', populate: { path: 'region', model: 'Region' } })
      .populate({ path: 'produits.produit', populate: { path: 'categorie', model: 'Categorie' } });

      res.status(201).json(populated);
      return;
  } catch (error) {
      res.status(400).json({ message: 'Erreur lors de la création.', error: (error as Error).message });
      return;
  }
};

/**
 * PUT /commande-produits/:commandeId
 */
export const updateCommande = async (req: Request, res: Response) => {
  try {
    const { commandeId } = req.params;
    const updateData = req.body;

    const updated = await Commande.findByIdAndUpdate(commandeId, updateData, { new: true })
      .populate('user', '-password')
      .populate('region')
      .populate({ path: 'pointVente', populate: { path: 'region', model: 'Region' } })
      .populate({ path: 'produits.produit', populate: { path: 'categorie', model: 'Categorie' } });

    if (!updated)  res.status(404).json({ message: 'Commande non trouvée.' });

      res.status(200).json(updated);
      return;
  } catch (error) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour.', error: (error as Error).message });
      return;
  }
};

/**
 * DELETE /commande-produits/:commandeId
 */
export const deleteCommande = async (req: Request, res: Response) => {
  try {
    const { commandeId } = req.params;

    const deleted = await Commande.findByIdAndDelete(commandeId);
    if (!deleted)  res.status(404).json({ message: 'Commande non trouvée.' });

    res.status(200).json({ message: 'Commande supprimée avec succès.' });
      return;
  } catch (error) {
      res.status(400).json({ message: 'Erreur lors de la suppression.', error: (error as Error).message });
      return;
  }
};
