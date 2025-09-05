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
exports.updatePointVente =
  exports.getPointVenteById =
  exports.deletePointVente =
  exports.createPointVente =
  exports.getPointVentesByRegion =
  exports.searchPointVentes =
  exports.getAllPointVentes =
    void 0;
const mongoose_1 = require("mongoose");
const model_1 = require("../Models/model");
/**
 * Util: construit le pipeline commun (match + lookup région + champs calculés + sort)
 */
function buildBasePipeline(opts) {
  const { q, regionId, sortBy = "createdAt", order = -1 } = opts;
  const match = {};
  if (regionId && mongoose_1.Types.ObjectId.isValid(regionId)) {
    match.region = new mongoose_1.Types.ObjectId(regionId);
  }
  if (q && q.trim()) {
    const rx = { $regex: q.trim(), $options: "i" };
    match.$or = [{ nom: rx }, { adresse: rx }];
  }
  // Pour pouvoir trier par region.nom, on expose regionNom
  const sortField = sortBy === "region.nom" ? "regionNom" : sortBy;
  const pipeline = [
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
const getAllPointVentes = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
      const q = req.query.q || undefined;
      const region = req.query.region || undefined;
      const sortBy = req.query.sortBy || "createdAt";
      const order = req.query.order === "asc" ? 1 : -1;
      const includeTotal =
        ((_a = req.query.includeTotal) !== null && _a !== void 0
          ? _a
          : "true") === "true";
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
              total: {
                $ifNull: [{ $arrayElemAt: ["$totalCount.total", 0] }, 0],
              },
            },
          },
        ];
        const agg = yield model_1.PointVente.aggregate(pipeline);
        const data =
          (_c =
            (_b = agg === null || agg === void 0 ? void 0 : agg[0]) === null ||
            _b === void 0
              ? void 0
              : _b.data) !== null && _c !== void 0
            ? _c
            : [];
        const total =
          (_e =
            (_d = agg === null || agg === void 0 ? void 0 : agg[0]) === null ||
            _d === void 0
              ? void 0
              : _d.total) !== null && _e !== void 0
            ? _e
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
      } else {
        const pipeline = [
          ...base,
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ];
        const data = yield model_1.PointVente.aggregate(pipeline);
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
  });
exports.getAllPointVentes = getAllPointVentes;
/**
 * GET /pointventes/search
 * q requis → délègue vers getAllPointVentes
 */
const searchPointVentes = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const q = (_a = req.query.q) === null || _a === void 0 ? void 0 : _a.trim();
    if (!q) res.status(400).json({ message: "Paramètre 'q' requis" });
    (0, exports.getAllPointVentes)(req, res);
  });
exports.searchPointVentes = searchPointVentes;
/**
 * GET /pointventes/region/:regionId
 * Même logique que la liste, mais regionId est imposé par params
 */
const getPointVentesByRegion = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
      const { regionId } = req.params;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
      const q = req.query.q || undefined;
      const sortBy = req.query.sortBy || "createdAt";
      const order = req.query.order === "asc" ? 1 : -1;
      const includeTotal =
        ((_a = req.query.includeTotal) !== null && _a !== void 0
          ? _a
          : "true") === "true";
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
              total: {
                $ifNull: [{ $arrayElemAt: ["$totalCount.total", 0] }, 0],
              },
            },
          },
        ];
        const agg = yield model_1.PointVente.aggregate(pipeline);
        const data =
          (_c =
            (_b = agg === null || agg === void 0 ? void 0 : agg[0]) === null ||
            _b === void 0
              ? void 0
              : _b.data) !== null && _c !== void 0
            ? _c
            : [];
        const total =
          (_e =
            (_d = agg === null || agg === void 0 ? void 0 : agg[0]) === null ||
            _d === void 0
              ? void 0
              : _d.total) !== null && _e !== void 0
            ? _e
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
      } else {
        const pipeline = [
          ...base,
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ];
        const data = yield model_1.PointVente.aggregate(pipeline);
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
  });
exports.getPointVentesByRegion = getPointVentesByRegion;
/**
 * POST /pointventes
 */
const createPointVente = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { nom, adresse, region } = req.body;
      const pointVente = new model_1.PointVente({ nom, adresse, region });
      yield pointVente.save();
      res.status(201).json(pointVente);
    } catch (err) {
      res
        .status(400)
        .json({ message: "Erreur lors de la création", error: err });
    }
  });
exports.createPointVente = createPointVente;
/**
 * DELETE /pointventes/:id
 */
const deletePointVente = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      yield model_1.Produit.deleteMany({ pointVente: id });
      yield model_1.PointVente.findByIdAndDelete(id);
      res.json({
        message: "Point de vente et ses produits supprimés avec succès",
      });
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.deletePointVente = deletePointVente;
/**
 * GET /pointventes/:id
 * Query:
 *  - includeStock (true/false) : si true → populate('stock.produit')
 */
const getPointVenteById = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
      const { id } = req.params;
      const includeStock =
        ((_a = req.query.includeStock) !== null && _a !== void 0
          ? _a
          : "true") === "true";
      let query = model_1.PointVente.findById(id).populate("region");
      if (includeStock) {
        query = query.populate("stock.produit");
      }
      const pointVente = yield query.exec();
      if (!pointVente) {
        res.status(404).json({ message: "Point de vente non trouvé" });
        return;
      }
      res.json(pointVente);
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getPointVenteById = getPointVenteById;
/**
 * PUT /pointventes/:id
 */
const updatePointVente = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedPointVente = yield model_1.PointVente.findByIdAndUpdate(
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
  });
exports.updatePointVente = updatePointVente;
