import { Request, Response } from "express";
import { Region } from "../Models/model";

/**
 * GET /regions
 * Query:
 *  - page, limit
 *  - q (recherche sur nom, optionnel)
 *  - ville (filtre exact ou regex-insensible)
 *  - sortBy: createdAt | nom | ville | pointVenteCount
 *  - order: asc | desc
 *  - includeTotal: 'true' | 'false'
 */
export const getAllRegions = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const q = (req.query.q as string)?.trim();
    const ville = (req.query.ville as string)?.trim();
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const order = (req.query.order as string) === "asc" ? 1 : -1;
    const includeTotal = (req.query.includeTotal ?? "true") === "true";

    // $match de base (sur champs de Region)
    const match: Record<string, any> = {};
    if (q) match.nom = { $regex: q, $options: "i" };
    if (ville) match.ville = { $regex: ville, $options: "i" };

    // pipeline commun
    const basePipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: "pointventes",
          localField: "_id",
          foreignField: "region",
          as: "pointsVente",
        },
      },
      { $addFields: { pointVenteCount: { $size: "$pointsVente" } } },
      {
        $project: {
          nom: 1,
          ville: 1,
          pointVenteCount: 1,
          createdAt: 1,
        },
      },
      { $sort: { [sortBy]: order } },
    ];

    if (includeTotal) {
      const pipeline = [
        ...basePipeline,
        {
          $facet: {
            data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
            totalCount: [{ $count: "total" }],
          },
        },
        {
          $project: {
            data: 1,
            total: { $ifNull: [{ $arrayElemAt: ["$totalCount.total", 0] }, 0] },
          },
        },
      ];

      const agg = await Region.aggregate(pipeline);
      const data = agg?.[0]?.data ?? [];
      const total = agg?.[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      res.json({
        data,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
      });
      return;
    } else {
      // pas de countDocuments
      const pipeline = [
        ...basePipeline,
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];
      const data = await Region.aggregate(pipeline);
      res.json({
        data,
        meta: {
          page,
          limit,
          total: data.length,
          totalPages: 1,
          hasPrev: false,
          hasNext: false,
        },
      });
      return;
    }
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/**
 * GET /regions/search
 * Idem getAllRegions mais q est requis.
 */
export const searchRegions = async (req: Request, res: Response) => {
  const q = (req.query.q as string)?.trim();
  if (!q) res.status(400).json({ message: "Paramètre 'q' requis" });

  // On délègue à getAllRegions (qui sait gérer q) en gardant les mêmes query params
  getAllRegions(req, res);
  return;
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

    const updated = await Region.findByIdAndUpdate(
      id,
      { nom, ville },
      { new: true, runValidators: true },
    );

    if (!updated) {
      res.status(404).json({ message: "Région non trouvée" });
      return;
    }

    res.json(updated);
    return;
  } catch (err: any) {
    res
      .status(400)
      .json({ message: "Erreur lors de la mise à jour", error: err.message });
    return;
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
