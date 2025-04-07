import { Request, Response } from "express";
import { Organisation } from "../Models/model";

export const getAllOrganisations = async (req: Request, res: Response) => {
  try {
    const organisations = await Organisation.find();
    res.json(organisations);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const getOrganisationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organisation = await Organisation.findById(id);
    if (!organisation) {
      res.status(404).json({ message: "Organisation non trouvée" });
      return;
    }
    res.json(organisation);
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};

export const createOrganisation = async (req: Request, res: Response) => {
  try {
    const { nom, adresse, telephone, email } = req.body;
    const organisation = new Organisation({ nom, adresse, telephone, email });
    await organisation.save();
    res.status(201).json(organisation);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

export const deleteOrganisation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Organisation.findByIdAndDelete(id);
    res.json({ message: "Organisation supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};
