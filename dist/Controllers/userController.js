"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser =
  exports.deleteUser =
  exports.getUsersByPointVente =
  exports.getUsersByRegion =
  exports.getAllUsers =
    void 0;
const mongoose_1 = require("mongoose");
const model_1 = require("../Models/model");
const uploadService_1 = require("../services/uploadService");
const getAllUsers = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
      const q =
        (_a = req.query.q) === null || _a === void 0 ? void 0 : _a.trim();
      const role =
        (_b = req.query.role) === null || _b === void 0 ? void 0 : _b.trim();
      const regionId =
        (_c = req.query.region) === null || _c === void 0 ? void 0 : _c.trim();
      const pointVenteId =
        (_d = req.query.pointVente) === null || _d === void 0
          ? void 0
          : _d.trim();
      const sortBy = (req.query.sortBy || "createdAt").trim();
      const order = req.query.order === "asc" ? 1 : -1;
      const includeTotal =
        ((_e = req.query.includeTotal) !== null && _e !== void 0
          ? _e
          : "true") === "true";
      const rx = q ? { $regex: q, $options: "i" } : null;
      const sortField =
        sortBy === "region.nom"
          ? "regionNom"
          : sortBy === "pointVente.nom"
            ? "pointVenteNom"
            : sortBy;
      const basePipeline = [
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
        // --- FIX ROBUSTE: convertir l'ID de région du PV si string → ObjectId
        {
          $addFields: {
            pvRegionId: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: [{ $type: "$pointVente.region" }, "objectId"],
                    },
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
        // région du pointVente (lookup standard sur pvRegionId)
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
        ...(regionId && mongoose_1.Types.ObjectId.isValid(regionId)
          ? [
              {
                $match: {
                  $or: [
                    { "region._id": new mongoose_1.Types.ObjectId(regionId) },
                    {
                      "pointVente.region._id": new mongoose_1.Types.ObjectId(
                        regionId,
                      ),
                    },
                  ],
                },
              },
            ]
          : []),
        ...(pointVenteId && mongoose_1.Types.ObjectId.isValid(pointVenteId)
          ? [
              {
                $match: {
                  "pointVente._id": new mongoose_1.Types.ObjectId(pointVenteId),
                },
              },
            ]
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
        // shape final
        {
          $project: {
            nom: 1,
            prenom: 1,
            email: 1,
            telephone: 1,
            adresse: 1,
            role: 1,
            image: 1,
            createdAt: 1,
            updatedAt: 1,
            region: 1, // doc region (si défini)
            pointVente: 1, // doc pointVente + region peuplée
            regionNom: 1,
            pointVenteNom: 1,
            // Nettoyage interne
            pvRegionId: 0,
            pvRegion: 0,
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
              total: {
                $ifNull: [{ $arrayElemAt: ["$totalCount.total", 0] }, 0],
              },
            },
          },
        ];
        const agg = yield model_1.User.aggregate(pipeline).allowDiskUse(true);
        const data =
          (_g =
            (_f = agg === null || agg === void 0 ? void 0 : agg[0]) === null ||
            _f === void 0
              ? void 0
              : _f.data) !== null && _g !== void 0
            ? _g
            : [];
        const total =
          (_j =
            (_h = agg === null || agg === void 0 ? void 0 : agg[0]) === null ||
            _h === void 0
              ? void 0
              : _h.total) !== null && _j !== void 0
            ? _j
            : 0;
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
      }
      const data = yield model_1.User.aggregate([
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
  });
exports.getAllUsers = getAllUsers;
// --- le reste de ton contrôleur inchangé ---
const getUsersByRegion = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
      const regionParam =
        (_a = req.params) === null || _a === void 0 ? void 0 : _a.regionId;
      const regionId =
        (regionParam &&
          mongoose_1.Types.ObjectId.isValid(regionParam) &&
          regionParam) ||
        ((_b = req.user) === null || _b === void 0 ? void 0 : _b.region) ||
        "";
      if (!regionId || !mongoose_1.Types.ObjectId.isValid(regionId)) {
        res.status(400).json({ message: "regionId invalide" });
      }
      req.query.region = regionId;
      (0, exports.getAllUsers)(req, res);
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getUsersByRegion = getUsersByRegion;
const getUsersByPointVente = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { pointVenteId } = req.params;
      if (!pointVenteId || !mongoose_1.Types.ObjectId.isValid(pointVenteId)) {
        res.status(400).json({ message: "ID du point de vente invalide" });
      }
      req.query.pointVente = pointVenteId;
      (0, exports.getAllUsers)(req, res);
    } catch (err) {
      console.error("Erreur dans getUsersByPointVente:", err);
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getUsersByPointVente = getUsersByPointVente;
const deleteUser = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { userId } = req.params;
      const user = yield model_1.User.findById(userId);
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
        yield model_1.User.findByIdAndDelete(userId);
        res.json({ message: "Utilisateur supprimé avec succès" });
        return;
      }
      res.status(403).json({ message: "Accès refusé" });
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.deleteUser = deleteUser;
const updateUser = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
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
      const user = yield model_1.User.findById(_id);
      if (!user) {
        res.status(404).json({ message: "Utilisateur non trouvé" });
        return;
      }
      const updateFields = {};
      if (nom) updateFields.nom = nom;
      if (prenom) updateFields.prenom = prenom;
      if (adresse) updateFields.adresse = adresse;
      if (role) updateFields.role = role;
      if (pointVente) updateFields.pointVente = pointVente;
      if (region) updateFields.region = region;
      if (req.file) {
        try {
          const imagePath = yield (0, uploadService_1.uploadFile)(
            req.file,
            role || user.role,
          );
          updateFields.image = imagePath;
        } catch (_a) {
          res.status(500).json({ message: "Échec de l'upload de l'image" });
          return;
        }
      }
      if (telephone && telephone !== user.telephone) {
        const existingUser = yield model_1.User.findOne({
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
        const existingEmail = yield model_1.User.findOne({ email });
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
      const updatedUser = yield model_1.User.findByIdAndUpdate(
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
  });
exports.updateUser = updateUser;
