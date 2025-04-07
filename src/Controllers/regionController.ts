import { Request, Response } from "express";
import { Region } from "../Models/model";

export const getAllRegions = async (req: Request, res: Response) => {
  try {
    const regions = await Region.find();
    res.json(regions);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const createRegion = async (req: Request, res: Response) => {
  try {
    const { nom, ville } = req.body;
    const region = new Region({ nom, ville });
    await region.save();
    res.status(201).json(region);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

export const deleteRegion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Region.findByIdAndDelete(id);
    res.json({ message: "Région supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const getRegionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const region = await Region.findById(id);
    if (!region) {
      res.status(404).json({ message: "Région non trouvée" });
      return;
    }
    res.json(region);
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};
