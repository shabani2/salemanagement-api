import { Request, Response } from "express";
import { Region } from "../Models/model";

// export const getAllRegions = async (req: Request, res: Response) => {
//   try {
//     const regions = await Region.find();
//     res.json(regions);
//   } catch (err) {
//     res.status(500).json({ message: "Erreur interne", error: err });
//   }
// };

export const getAllRegions = async (req: Request, res: Response) => {
  try {
    const regions = await Region.aggregate([
      {
        $lookup: {
          from: "pointventes", // le nom de la collection MongoDB (attention au pluriel et minuscule)
          localField: "_id",
          foreignField: "region",
          as: "pointsVente",
        },
      },
      {
        $addFields: {
          pointVenteCount: { $size: "$pointsVente" },
        },
      },
      {
        $project: {
          nom: 1,
          ville: 1,
          pointVenteCount: 1,
        },
      },
    ]);

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

export const updateRegion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nom, ville } = req.body;

    // Mise à jour de la région avec validation et retour du document modifié
    const updated = await Region.findByIdAndUpdate(
      id,
      { nom, ville },
      { new: true, runValidators: true }
    );

    if (!updated) {
      
      res.status(404).json({ message: 'Région non trouvée' });
      return
    }

    res.json(updated);
    return;
  } catch (err: any) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour', error: err.message });
    return
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
