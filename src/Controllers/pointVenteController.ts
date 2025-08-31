// controllers/pointVenteController.ts
import { Request, Response } from "express";
import { Types } from "mongoose";
import { PointVente, Produit } from "../Models/model";

/**
 * Util: construit le pipeline commun (match + lookup région + champs calculés + sort)
 */
function buildBasePipeline(opts: {
  q?: string;
  regionId?: string;
  sortBy?: string;
  order?: 1 | -1;
}) {
  const { q, regionId, sortBy = "createdAt", order = -1 } = opts;

  const match: Record<string, any> = {};
  if (regionId && Types.ObjectId.isValid(regionId)) {
    match.region = new Types.ObjectId(regionId);
  }
  if (q && q.trim()) {
    const rx = { $regex: q.trim(), $options: "i" };
    match.$or = [{ nom: rx }, { adresse: rx }];
  }

  // Pour pouvoir trier par region.nom, on expose regionNom
  const sortField = sortBy === "region.nom" ? "regionNom" : sortBy;

  const pipeline: any[] = [
    { $match: match },
    {
      $lookup: {
        from: "regions",
        localField: "region",
        foreignField: "_id",
        as: "region",
      },
    },
    { $unwind: { path: "$region", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        regionNom: { $ifNull: ["$region.nom", ""] },
        stockCount: { $size: { $ifNull: ["$stock", []] } },
      },
    },
    {
      $project: {
        nom: 1,
        adresse: 1,
        region: 1, // objet région (issu du $lookup)
        regionNom: 1, // utile au tri
        stockCount: 1, // compteur d’items stock
        createdAt: 1,
        updatedAt: 1,
        // NOTE: on n’inclut pas le détail du stock ici pour rester léger.
      },
    },
    { $sort: { [sortField]: order } },
  ];

  return pipeline;
}

/**
 * GET /pointventes
 * Query:
 *  - page, limit
 *  - q, region
 *  - sortBy (ex: createdAt | nom | region.nom | stockCount)
 *  - order (asc|desc)
 *  - includeTotal (true/false)
 *  - includeStock (ignoré en liste, géré dans /:id)
 */
export const getAllPointVentes = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const q = (req.query.q as string) || undefined;
    const region = (req.query.region as string) || undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const order: 1 | -1 = (req.query.order as string) === "asc" ? 1 : -1;
    const includeTotal = (req.query.includeTotal ?? "true") === "true";

    const base = buildBasePipeline({ q, regionId: region, sortBy, order });

    if (includeTotal) {
      const pipeline = [
        ...base,
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

      const agg = await PointVente.aggregate(pipeline);
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
    } else {
      const pipeline = [
        ...base,
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];
      const data = await PointVente.aggregate(pipeline);
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
    }
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/**
 * GET /pointventes/search
 * q requis → délègue vers getAllPointVentes
 */
export const searchPointVentes = async (req: Request, res: Response) => {
  const q = (req.query.q as string)?.trim();
  if (!q) res.status(400).json({ message: "Paramètre 'q' requis" });
  getAllPointVentes(req, res);
};

/**
 * GET /pointventes/region/:regionId
 * Même logique que la liste, mais regionId est imposé par params
 */
export const getPointVentesByRegion = async (req: Request, res: Response) => {
  try {
    const { regionId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const q = (req.query.q as string) || undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const order: 1 | -1 = (req.query.order as string) === "asc" ? 1 : -1;
    const includeTotal = (req.query.includeTotal ?? "true") === "true";

    const base = buildBasePipeline({ q, regionId, sortBy, order });

    if (includeTotal) {
      const pipeline = [
        ...base,
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

      const agg = await PointVente.aggregate(pipeline);
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
    } else {
      const pipeline = [
        ...base,
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ];
      const data = await PointVente.aggregate(pipeline);
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
    }
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/**
 * POST /pointventes
 */
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

/**
 * DELETE /pointventes/:id
 */
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

/**
 * GET /pointventes/:id
 * Query:
 *  - includeStock (true/false) : si true → populate('stock.produit')
 */
export const getPointVenteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeStock = (req.query.includeStock ?? "true") === "true";

    let query = PointVente.findById(id).populate("region");
    if (includeStock) {
      query = query.populate("stock.produit");
    }
    const pointVente = await query.exec();

    if (!pointVente) {
      res.status(404).json({ message: "Point de vente non trouvé" });
      return;
    }
    res.json(pointVente);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/**
 * PUT /pointventes/:id
 */
export const updatePointVente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedPointVente = await PointVente.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedPointVente) {
      res.status(404).json({ message: "Point de vente non trouvé" });
      return;
    }

    res.json({
      message: "Point de vente mis à jour avec succès",
      pointVente: updatedPointVente,
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};
