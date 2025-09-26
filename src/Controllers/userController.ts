// file: src/controllers/user.controller.ts
import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { User, UserRoleType } from "../Models/model";
import { uploadFile } from "../services/uploadService";
import { MulterRequest } from "../Models/multerType";
import { IUser } from "../Models/interfaceModels";
import { USER_ROLES } from "../Utils/constant";


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Liste paginée/filtrée des utilisateurs */
export const getAllUsers: RequestHandler = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const q = (req.query.q as string | undefined)?.trim();
    const role = (req.query.role as string | undefined)?.trim();
    const regionId = (req.query.region as string | undefined)?.trim();
    const pointVenteId = (req.query.pointVente as string | undefined)?.trim();
    const sortBy = ((req.query.sortBy as string | undefined) || "createdAt").trim();
    const order: 1 | -1 = (req.query.order as string | undefined) === "asc" ? 1 : -1;
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
      { $lookup: { from: "regions", localField: "region", foreignField: "_id", as: "region" } },
      { $unwind: { path: "$region", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "pointventes", localField: "pointVente", foreignField: "_id", as: "pointVente" } },
      { $unwind: { path: "$pointVente", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          pvRegionId: {
            $switch: {
              branches: [
                { case: { $eq: [{ $type: "$pointVente.region" }, "objectId"] }, then: "$pointVente.region" },
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
      { $lookup: { from: "regions", localField: "pvRegionId", foreignField: "_id", as: "pvRegion" } },
      { $unwind: { path: "$pvRegion", preserveNullAndEmptyArrays: true } },
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
      { $addFields: { regionNom: { $ifNull: ["$region.nom", "$pointVente.region.nom"] }, pointVenteNom: "$pointVente.nom" } },
      ...(regionId && Types.ObjectId.isValid(regionId)
        ? [{ $match: { $or: [{ "region._id": new Types.ObjectId(regionId) }, { "pointVente.region._id": new Types.ObjectId(regionId) }] } }]
        : []),
      ...(pointVenteId && Types.ObjectId.isValid(pointVenteId)
        ? [{ $match: { "pointVente._id": new Types.ObjectId(pointVenteId) } }]
        : []),
      ...(rx
        ? [{ $match: { $or: [{ nom: rx }, { prenom: rx }, { email: rx }, { telephone: rx }, { role: rx }, { regionNom: rx }, { pointVenteNom: rx }] } }]
        : []),
      {
        $project: {
          nom: 1, prenom: 1, email: 1, telephone: 1, adresse: 1,
          role: 1, image: 1, createdAt: 1, updatedAt: 1,
          region: 1, pointVente: 1, regionNom: 1, pointVenteNom: 1,
        },
      },
      { $sort: { [sortField]: order } },
    ];

    if (includeTotal) {
      const pipeline = [
        ...basePipeline,
        { $facet: { data: [{ $skip: (page - 1) * limit }, { $limit: limit }], totalCount: [{ $count: "total" }] } },
        { $project: { data: 1, total: { $ifNull: [{ $arrayElemAt: ["$totalCount.total", 0] }, 0] } } },
      ];

      const agg = await User.aggregate(pipeline).allowDiskUse(true);
      const data = agg?.[0]?.data ?? [];
      const total = agg?.[0]?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      res.json({ data, meta: { page, limit, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages } });
      return;
    }

    const data = await User.aggregate([
      ...basePipeline,
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).allowDiskUse(true);

    res.json({ data, meta: { page, limit, total: data.length, totalPages: 1, hasPrev: false, hasNext: false } });
  } catch {
    res.status(500).json({ message: "Erreur interne" });
  }
};

/** Par région: délègue à getAllUsers */
export const getUsersByRegion: RequestHandler = async (req, res, next) => {
  try {
    const regionParam = (req.params as any)?.regionId as string | undefined;
    const fromUser = req.user?.region ? String(req.user.region) : undefined;
    const regionId =
      regionParam && Types.ObjectId.isValid(regionParam) ? regionParam : fromUser;

    if (!regionId || !Types.ObjectId.isValid(regionId)) {
      res.status(400).json({ message: "regionId invalide" });
      return;
    }

    (req.query as any).region = regionId;
    return getAllUsers(req, res, next);
  } catch {
    res.status(500).json({ message: "Erreur interne" });
  }
};

/** Par point de vente: délègue à getAllUsers */
export const getUsersByPointVente: RequestHandler = async (req, res, next) => {
  try {
    const { pointVenteId } = req.params as { pointVenteId?: string };
    if (!pointVenteId || !Types.ObjectId.isValid(pointVenteId)) {
      res.status(400).json({ message: "ID du point de vente invalide" });
      return;
    }
    (req.query as any).pointVente = pointVenteId;
    return getAllUsers(req, res, next);
  } catch {
    res.status(500).json({ message: "Erreur interne" });
  }
};

export const deleteUser: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params as { userId?: string };
    if (!userId || !Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: "userId invalide" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "Utilisateur non trouvé" });
      return;
    }
    if (!req.user) {
      res.status(401).json({ message: "Non authentifié" });
      return;
    }

    const r = req.user;
    if (
      r.role === "SuperAdmin" ||
      (r.role === "AdminRegion" && String(user.region) === String(r.region)) ||
      (r.role === "AdminPointVente" && String(user.pointVente) === String(r.pointVente))
    ) {
      await User.findByIdAndDelete(userId);
      res.json({ message: "Utilisateur supprimé avec succès" });
      return;
    }

    res.status(403).json({ message: "Accès refusé" });
  } catch {
    res.status(500).json({ message: "Erreur interne" });
  }
};


export const createUser: RequestHandler = async (req, res) => {
    const mreq = req as MulterRequest;

    try {
        const {
            nom,
            prenom,
            telephone,
            email,
            adresse,
            role,
            region,
            pointVente,
            password,
        } = mreq.body;

        // ------------------------------------------
        // 1. Validations minimales (Email, Password)
        // ------------------------------------------
        if (!emailRegex.test(email)) {
            res.status(400).json({ message: "Email invalide." });
            return;
        }

        if (!password || password.length < 6) {
            res.status(400).json({ message: "Mot de passe requis (min 6 caractères)." });
            return;
        }

        // ------------------------------------------
        // 2. Unicité email/téléphone
        // ------------------------------------------
        const existingUser = await User.findOne({ $or: [{ email }, { telephone }] });
        if (existingUser) {
            res.status(400).json({ message: "Email ou téléphone déjà utilisé." });
            return;
        }

        // ------------------------------------------
        // 3. Image (optionnel)
        // ------------------------------------------
        let imagePath = "";
        if (mreq.file) {
            try {
                imagePath = await uploadFile(mreq.file, role);
            } catch (uploadError) {
                res.status(500).json({ message: "Échec de l'upload de l'image." });
                return;
            }
        }

        // ------------------------------------------
        // 4. Règles de rôle
        // ------------------------------------------
        const onlyRegion: UserRoleType[] = ["AdminRegion"];
        const needsPointVente: UserRoleType[] = ["AdminPointVente", "Vendeur", "Logisticien"];

        if (!USER_ROLES.includes(role)) {
            res.status(400).json({ message: `Rôle invalide : ${role}` });
            return;
        }

        if (onlyRegion.includes(role) && !region) {
            res.status(400).json({ message: "La région est requise pour un AdminRegion." });
            return;
        }

        if (needsPointVente.includes(role) && !pointVente) {
            res.status(400).json({ message: "Le point de vente est requis pour ce rôle." });
            return;
        }

        // ------------------------------------------
        // 5. Création de l'utilisateur
        // ------------------------------------------
        const userPayload: Partial<IUser> & { password: string } = {
            nom,
            prenom,
            telephone,
            email,
            adresse,
            role,
            image: imagePath,
            password,
            firstConnection: false,
            emailVerified: true,
            isActive: true,
        };

        if (onlyRegion.includes(role)) {
            (userPayload as any).region = region;
        }

        if (needsPointVente.includes(role)) {
            (userPayload as any).pointVente = pointVente;
        }

        const user = await new User(userPayload).save();

        // ------------------------------------------
        // 6. Réponse de succès
        // ------------------------------------------
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            message: `Compte ${user.email} créé avec succès.`,
            user: userResponse,
        });

    } catch (err) {
        console.error("createUser error:", err);
        res.status(500).json({ message: "Erreur interne lors de la création de l'utilisateur." });
    }
};

export const updateUser: RequestHandler = async (req, res) => {
    const mreq = req as MulterRequest;

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
        } = mreq.body ?? {};

        if (!_id || !Types.ObjectId.isValid(_id)) {
            res.status(400).json({ message: "_id invalide" });
            return;
        }

        const user = await User.findById(_id);
        if (!user) {
            res.status(404).json({ message: "Utilisateur non trouvé" });
            return;
        }

        const updateFields: Record<string, any> = {};

        if (nom) updateFields.nom = nom;
        if (prenom) updateFields.prenom = prenom;
        if (adresse) updateFields.adresse = adresse;
        if (role) updateFields.role = role;
        if (pointVente) updateFields.pointVente = pointVente;
        if (region) updateFields.region = region;

        // Gestion de l'image (si uploadé)
        if (mreq.file) {
            try {
                const imagePath = await uploadFile(mreq.file, role || user.role);
                updateFields.image = imagePath;
            } catch {
                res.status(500).json({ message: "Échec de l'upload de l'image" });
                return;
            }
        }

        // Vérification téléphone / email
        if (telephone && telephone !== user.telephone) {
            const existingUser = await User.findOne({
                $or: [{ telephone }, { email: telephone }],
            });
            if (existingUser && String(existingUser._id) !== String(user._id)) {
                res.status(400).json({ message: "Le numéro de téléphone ou l'email est déjà utilisé" });
                return;
            }

            updateFields.telephone = telephone;

            // Optionnel : tu avais un comportement où email = téléphone si téléphone change
            updateFields.email = telephone;
        }

        if (email && email !== user.email) {
            if (!emailRegex.test(email)) {
                res.status(400).json({ message: "Email invalide" });
                return;
            }

            const existingEmail = await User.findOne({ email });
            if (existingEmail && String(existingEmail._id) !== String(user._id)) {
                res.status(400).json({ message: "Cet email est déjà utilisé" });
                return;
            }

            updateFields.email = email;
        }

        // Aucun champ à mettre à jour ?
        if (Object.keys(updateFields).length === 0) {
            res.status(200).json({ message: "Aucune modification effectuée." });
            return;
        }

        const updatedUser = await User.findByIdAndUpdate(
            _id,
            { $set: updateFields },
            { new: true, runValidators: true }
        )
            .populate("region")
            .populate({
                path: "pointVente",
                populate: [{ path: "region" }, { path: "stock" }],
            });

        if (!updatedUser) {
            res.status(500).json({ message: "Échec de la mise à jour de l'utilisateur" });
            return;
        }

        res.json(updatedUser);
    } catch (err) {
        console.error("updateUser error:", err);
        res.status(500).json({
            message: "Erreur interne",
            error: err instanceof Error ? err.message : String(err),
        });
    }
};
