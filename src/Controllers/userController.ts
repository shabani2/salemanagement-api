// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { Types } from "mongoose";
import { User } from "../Models/model";
import { AuthenticatedRequest } from "../Middlewares/auth";
import { uploadFile } from "../services/uploadService";
import { MulterRequest } from "../Models/multerType";

/**
 * Liste paginée/filtrée des utilisateurs.
 * Pourquoi: projection pure inclusion (évite l'erreur 31254) + return après res.json.
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const q = (req.query.q as string)?.trim();
    const role = (req.query.role as string)?.trim();
    const regionId = (req.query.region as string)?.trim();
    const pointVenteId = (req.query.pointVente as string)?.trim();
    const sortBy = ((req.query.sortBy as string) || "createdAt").trim();
    const order: 1 | -1 = (req.query.order as string) === "asc" ? 1 : -1;
    const includeTotal = (req.query.includeTotal ?? "true") === "true";

    const rx = q ? { $regex: q, $options: "i" } : null;
    const sortField =
      sortBy === "region.nom"
        ? "regionNom"
        : sortBy === "pointVente.nom"
          ? "pointVenteNom"
          : sortBy;

    const basePipeline: any[] = [
      ...(role ? [{ $match: { role } }] : []),

      // region directe
      {
        $lookup: {
          from: "regions",
          localField: "region",
          foreignField: "_id",
          as: "region",
        },
      },
      { $unwind: { path: "$region", preserveNullAndEmptyArrays: true } },

      // pointVente
      {
        $lookup: {
          from: "pointventes",
          localField: "pointVente",
          foreignField: "_id",
          as: "pointVente",
        },
      },
      { $unwind: { path: "$pointVente", preserveNullAndEmptyArrays: true } },

      // convertir ID région du PV si string → ObjectId
      {
        $addFields: {
          pvRegionId: {
            $switch: {
              branches: [
                {
                  case: { $eq: [{ $type: "$pointVente.region" }, "objectId"] },
                  then: "$pointVente.region",
                },
                {
                  case: {
                    $and: [
                      { $eq: [{ $type: "$pointVente.region" }, "string"] },
                      { $eq: [{ $strLenCP: "$pointVente.region" }, 24] },
                    ],
                  },
                  then: { $toObjectId: "$pointVente.region" },
                },
              ],
              default: null,
            },
          },
        },
      },

      // région du pointVente
      {
        $lookup: {
          from: "regions",
          localField: "pvRegionId",
          foreignField: "_id",
          as: "pvRegion",
        },
      },
      { $unwind: { path: "$pvRegion", preserveNullAndEmptyArrays: true } },

      // Injecter la région peuplée dans pointVente.region
      {
        $addFields: {
          pointVente: {
            $cond: [
              { $ifNull: ["$pointVente._id", false] },
              { $mergeObjects: ["$pointVente", { region: "$pvRegion" }] },
              "$pointVente",
            ],
          },
        },
      },

      // libellés pour tri/recherche
      {
        $addFields: {
          regionNom: { $ifNull: ["$region.nom", "$pointVente.region.nom"] },
          pointVenteNom: "$pointVente.nom",
        },
      },

      // filtres
      ...(regionId && Types.ObjectId.isValid(regionId)
        ? [
            {
              $match: {
                $or: [
                  { "region._id": new Types.ObjectId(regionId) },
                  { "pointVente.region._id": new Types.ObjectId(regionId) },
                ],
              },
            },
          ]
        : []),

      ...(pointVenteId && Types.ObjectId.isValid(pointVenteId)
        ? [{ $match: { "pointVente._id": new Types.ObjectId(pointVenteId) } }]
        : []),

      // recherche q
      ...(rx
        ? [
            {
              $match: {
                $or: [
                  { nom: rx },
                  { prenom: rx },
                  { email: rx },
                  { telephone: rx },
                  { role: rx },
                  { regionNom: rx },
                  { pointVenteNom: rx },
                ],
              },
            },
          ]
        : []),

      // projection PURE INCLUSION (ne pas exclure pvRegionId/pvRegion ici)
      {
        $project: {
          // Autorisé: exclusion de _id si souhaité
          // _id: 0,
          nom: 1,
          prenom: 1,
          email: 1,
          telephone: 1,
          adresse: 1,
          role: 1,
          image: 1,
          createdAt: 1,
          updatedAt: 1,
          region: 1,
          pointVente: 1,
          regionNom: 1,
          pointVenteNom: 1,
        },
      },

      { $sort: { [sortField]: order } },
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

      const agg = await User.aggregate(pipeline).allowDiskUse(true);
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
      return; // important: évite un second res.json
    }

    const data = await User.aggregate([
      ...basePipeline,
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).allowDiskUse(true);

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
  } catch (err) {
    console.error("Erreur dans getAllUsers:", err);
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/**
 * Par région.
 * Pourquoi: `return` la délégation pour ne pas répondre deux fois.
 */
export const getUsersByRegion = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const regionParam = (req.params as any)?.regionId as string | undefined;
    const regionId =
      (regionParam && Types.ObjectId.isValid(regionParam) && regionParam) ||
      (req.user?.region as string) ||
      "";

    if (!regionId || !Types.ObjectId.isValid(regionId)) {
      res.status(400).json({ message: "regionId invalide" });
      return;
    }

    (req.query as any).region = regionId;
    return getAllUsers(req as unknown as Request, res);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/**
 * Par point de vente.
 * Pourquoi: `return` la délégation pour ne pas répondre deux fois.
 */
export const getUsersByPointVente = async (req: Request, res: Response) => {
  try {
    const { pointVenteId } = req.params as { pointVenteId?: string };
    if (!pointVenteId || !Types.ObjectId.isValid(pointVenteId)) {
      res.status(400).json({ message: "ID du point de vente invalide" });
      return;
    }
    (req.query as any).pointVente = pointVenteId;
    return getAllUsers(req, res);
  } catch (err) {
    console.error("Erreur dans getUsersByPointVente:", err);
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "Utilisateur non trouvé" });
      return;
    }

    if (
      req.user.role === "SuperAdmin" ||
      (req.user.role === "AdminRegion" &&
        String(user.region) === String(req.user.region)) ||
      (req.user.role === "AdminPointVente" &&
        String(user.pointVente) === String(req.user.pointVente))
    ) {
      await User.findByIdAndDelete(userId);
      res.json({ message: "Utilisateur supprimé avec succès" });
      return;
    }

    res.status(403).json({ message: "Accès refusé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const updateUser = async (
  req: MulterRequest,
  res: Response,
): Promise<void> => {
  try {
    const {
      _id,
      nom,
      prenom,
      email,
      adresse,
      telephone,
      role,
      pointVente,
      region,
    } = req.body;

    const user = await User.findById(_id);
    if (!user) {
      res.status(404).json({ message: "Utilisateur non trouvé" });
      return;
    }

    const updateFields: any = {};
    if (nom) updateFields.nom = nom;
    if (prenom) updateFields.prenom = prenom;
    if (adresse) updateFields.adresse = adresse;
    if (role) updateFields.role = role;
    if (pointVente) updateFields.pointVente = pointVente;
    if (region) updateFields.region = region;

    if (req.file) {
      try {
        const imagePath = await uploadFile(req.file, role || user.role);
        updateFields.image = imagePath;
      } catch {
        res.status(500).json({ message: "Échec de l'upload de l'image" });
        return;
      }
    }

    if (telephone && telephone !== user.telephone) {
      const existingUser = await User.findOne({
        $or: [{ telephone }, { email: telephone }],
      });
      if (existingUser && String(existingUser._id) !== String(user._id)) {
        res.status(400).json({
          message: "Le numéro de téléphone ou l'email est déjà utilisé",
        });
        return;
      }
      updateFields.telephone = telephone;
      updateFields.email = telephone;
    }
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail && String(existingEmail._id) !== String(user._id)) {
        res.status(400).json({ message: "Cet email est déjà utilisé" });
        return;
      }
      updateFields.email = email;
    }

    if (Object.keys(updateFields).length === 0) {
      res.status(200).json({ message: "Aucune modification effectuée." });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      _id,
      { $set: updateFields },
      { new: true, runValidators: true },
    )
      .populate("region")
      .populate({
        path: "pointVente",
        populate: [{ path: "region" }, { path: "stock" }],
      });

    if (!updatedUser) {
      res
        .status(500)
        .json({ message: "Échec de la mise à jour de l'utilisateur" });
      return;
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({
      message: "Erreur interne",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
