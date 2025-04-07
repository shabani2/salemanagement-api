import { Request, Response } from "express";
import { PointVente, Produit } from "../Models/model";

export const getAllPointVentes = async (req: Request, res: Response) => {
  try {
    const pointsVente = await PointVente.find()
      .populate("region")
      .populate("stock.produit");

    res.json(pointsVente);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const createPointVente = async (req: Request, res: Response) => {
  try {
    const { nom, adresse, region } = req.body;
    const pointVente = new PointVente({ nom, adresse, region });
    await pointVente.save();
    res.status(201).json(pointVente);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

export const deletePointVente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Produit.deleteMany({ pointVente: id });
    await PointVente.findByIdAndDelete(id);
    res.json({
      message: "Point de vente et ses produits supprimés avec succès",
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const getPointVenteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pointVente = await PointVente.findById(id);
    if (!pointVente) {
      return res.status(404).json({ message: "Point de vente non trouvé" });
    }
    res.json(pointVente);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};
export const updatePointVente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedPointVente = await PointVente.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );

    if (!updatedPointVente) {
      res.status(404).json({ message: "Point de vente non trouvé" });
      return;
    }

    res.json({
      message: "Point de vente mis à jour avec succès",
      pointVente: updatedPointVente,
    });
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};
