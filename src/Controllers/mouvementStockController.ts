import { Request, Response } from "express";
import { MouvementStock } from "../Models/model"; // Assure-toi d'avoir exporté MouvementStock dans ton fichier de modèles

export const getAllMouvementsStock = async (req: Request, res: Response) => {
  try {
    const mouvements = await MouvementStock.find()
      .sort({ createdAt: -1 }) // tri décroissant
      .populate("pointVente")
      .populate({
        path: "produit",
        populate: {
          path: "categorie",
          model: "Categorie",
        },
      });

    res.json(mouvements);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Obtenir un mouvement de stock par ID
export const getMouvementStockById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mouvement = await MouvementStock.findById(id)
      .populate("pointVente")
      .populate("produit")
      .populate("reference");

    if (!mouvement) {
      res.status(404).json({ message: "Mouvement non trouvé" });
      return;
    }

    res.json(mouvement);
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const createMouvementStock = async (req: Request, res: Response) => {
  try {
    const {
      pointVente,
      depotCentral,
      produit,
      type,
      quantite,
      montant,
      statut,
    } = req.body;

    const mouvement = new MouvementStock({
      pointVente: pointVente || undefined,
      depotCentral: depotCentral || undefined,
      produit,
      type,
      quantite,
      montant,
      statut,
    });

    await mouvement.save();
    res.status(201).json(mouvement);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

// 🔹 Mettre à jour un mouvement de stock
export const updateMouvementStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      pointVente,
      depotCentral,
      produit,
      type,
      quantite,
      montant,
      statut,
    } = req.body;

    if (!pointVente && depotCentral !== true) {
      res.status(400).json({
        message:
          "Un mouvement doit être associé à un point de vente ou être marqué comme venant du dépôt central.",
      });
      return;
    }

    const updated = await MouvementStock.findByIdAndUpdate(
      id,
      {
        pointVente,
        depotCentral,
        produit,
        type,
        quantite,
        montant,
        statut,
      },
      { new: true },
    );

    if (!updated) {
      res.status(404).json({ message: "Mouvement non trouvé" });
      return;
    }

    res.json(updated);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Erreur lors de la mise à jour", error: err });
  }
  return;
};

// 🔹 Supprimer un mouvement de stock
export const deleteMouvementStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await MouvementStock.findByIdAndDelete(id);
    res.json({ message: "Mouvement supprimé avec succès" });
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};

// 🔹 Valider le mouvement de stock (changer le statut en true)
export const validateState = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const mouvement = await MouvementStock.findById(id);

    if (!mouvement) {
      res.status(404).json({ message: "Mouvement non trouvé" });
      return;
    }

    mouvement.statut = true;
    await mouvement.save();

    res.json({ message: "Statut du mouvement mis à jour", mouvement });
    return;
  } catch (err) {
    res
      .status(500)
      .json({ message: "Erreur lors de la validation", error: err });
    return;
  }
};
