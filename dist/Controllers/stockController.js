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
exports.checkStockHandler =
  exports.checkStock =
  exports.deleteStock =
  exports.updateStock =
  exports.createStock =
  exports.getStockById =
  exports.getStocksByPointVente =
  exports.getStocksByRegion =
  exports.getAllStocks =
    void 0;
const model_1 = require("../Models/model");
const mongoose_1 = require("mongoose");
const getIdStr = (v) => {
  var _a, _b, _c, _d;
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v._id) {
    const s =
      (_b = (_a = v._id).toString) === null || _b === void 0
        ? void 0
        : _b.call(_a);
    if (typeof s === "string") return s;
  }
  return (_d =
    (_c = v.toString) === null || _c === void 0 ? void 0 : _c.call(v)) !==
    null && _d !== void 0
    ? _d
    : "";
};
const keyOf = (s) => {
  const prodId = getIdStr(s === null || s === void 0 ? void 0 : s.produit);
  const locId =
    getIdStr(s === null || s === void 0 ? void 0 : s.pointVente) ||
    getIdStr(s === null || s === void 0 ? void 0 : s.region) ||
    "DEPOT_CENTRAL";
  return `${prodId}|${locId}`;
};
const collapseLatest = (rows) => {
  // rows triées desc → le premier rencontré est le plus récent
  const seen = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!seen.has(k)) seen.set(k, r);
  }
  return Array.from(seen.values());
};
/** ===========================================================
 * GET /stocks (tous)
 * - Tri par dernière modif
 * - Déduplication (dernier état par couple produit/emplacement)
 * =========================================================== */
const getAllStocks = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const stocks = yield model_1.Stock.find()
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .populate({
          path: "produit",
          populate: { path: "categorie", model: "Categorie" },
        })
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate("region");
      //@ts-ignore
      const uniques = collapseLatest(stocks);
      res.json(uniques);
      return;
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
      return;
    }
  });
exports.getAllStocks = getAllStocks;
/** =========================================================== **/
// ✅ Correction robuste: inclure les stocks des PV appartenant à la région
//    via un $lookup, pour éviter tout mismatch de types/casts.
const getStocksByRegion = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
      const { regionId } = req.params;
      if (!regionId || !mongoose_1.Types.ObjectId.isValid(regionId)) {
        res.status(400).json({ message: "ID de région invalide" });
        return;
      }
      const regionObjId = new mongoose_1.Types.ObjectId(String(regionId));
      // Optionnel: restreindre à un PV précis via query ?pointVente=
      const qPv =
        (_a = req.query.pointVente) === null || _a === void 0
          ? void 0
          : _a.trim();
      const pvFilterId =
        qPv && mongoose_1.Types.ObjectId.isValid(qPv)
          ? new mongoose_1.Types.ObjectId(qPv)
          : undefined;
      // 1) On sélectionne les stocks:
      //    - soit rattachés directement à la région (stock.region == regionId)
      //    - soit rattachés à un PV (stock.pointVente != null)
      // 2) On $lookup le PV pour connaître sa région, puis on filtre
      //    sur pv.region == regionId.
      const matchedIds = yield model_1.Stock.aggregate([
        {
          $match: {
            $or: [
              { region: regionObjId },
              { pointVente: { $exists: true, $ne: null } },
            ],
          },
        },
        {
          $lookup: {
            from: "pointventes",
            localField: "pointVente",
            foreignField: "_id",
            as: "pv",
          },
        },
        { $addFields: { pvRegion: { $arrayElemAt: ["$pv.region", 0] } } },
        {
          $match: Object.assign(
            { $or: [{ region: regionObjId }, { pvRegion: regionObjId }] },
            pvFilterId ? { pointVente: pvFilterId } : {},
          ),
        },
        { $project: { _id: 1 } },
      ]);
      // Rien trouvé → tableau vide
      if (!matchedIds.length) {
        res.json([]);
        return;
      }
      // 3) On recharge proprement avec populate, tri, puis déduplication.
      const ids = matchedIds.map((d) => d._id);
      const stocks = yield model_1.Stock.find({ _id: { $in: ids } })
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .populate({
          path: "produit",
          populate: { path: "categorie", model: "Categorie" },
        })
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate("region")
        .lean();
      // @ts-ignore
      const uniques = collapseLatest(stocks);
      res.json(uniques);
      return;
    } catch (err) {
      console.error("[getStocksByRegion] error:", err);
      res.status(500).json({ message: "Erreur interne", error: err });
      return;
    }
  });
exports.getStocksByRegion = getStocksByRegion;
/** ===========================================================
 * GET /stocks/point-vente/:pointVenteId
 * - Filtre point de vente
 * - Tri par dernière modif
 * - Déduplication (dernier état par couple produit/emplacement)
 *   (utile si plusieurs versions d’un même produit existent)
 * =========================================================== */
const getStocksByPointVente = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { pointVenteId } = req.params;
      if (!pointVenteId) {
        res.status(400).json({ message: "ID du point de vente requis" });
        return;
      }
      const stocks = yield model_1.Stock.find({ pointVente: pointVenteId })
        .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
        .populate({
          path: "produit",
          populate: { path: "categorie", model: "Categorie" },
        })
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate("region");
      //@ts-ignore
      const uniques = collapseLatest(stocks);
      res.json(uniques);
      return;
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
      return;
    }
  });
exports.getStocksByPointVente = getStocksByPointVente;
/** ===========================================================
 * GET /stocks/:id (one)
 * - Inchangé : charge un document précis
 * =========================================================== */
const getStockById = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const stock = yield model_1.Stock.findById(id)
        .populate({
          path: "produit",
          populate: { path: "categorie", model: "Categorie" },
        })
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate("region");
      if (!stock) {
        res.status(404).json({ message: "Stock non trouvé" });
        return;
      }
      res.json(stock);
      return;
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
      return;
    }
  });
exports.getStockById = getStockById;
// 🔹 Créer un stock
const createStock = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { produit, quantite, montant, pointVente, depotCentral } = req.body;
      if (!pointVente && depotCentral !== true) {
        res.status(400).json({
          message:
            "Un stock doit être associé à un point de vente ou être marqué comme provenant du dépôt central.",
        });
        return;
      }
      const stock = new model_1.Stock({
        produit,
        quantite,
        montant,
        pointVente: pointVente || undefined,
        depotCentral: depotCentral || false,
      });
      yield stock.save();
      res.status(201).json(stock);
      return;
    } catch (err) {
      res
        .status(400)
        .json({ message: "Erreur lors de la création", error: err });
      return;
    }
  });
exports.createStock = createStock;
// 🔹 Mettre à jour un stock
const updateStock = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const { produit, quantite, montant, pointVente, depotCentral } = req.body;
      if (!pointVente && depotCentral !== true) {
        res.status(400).json({
          message:
            "Un stock doit être associé à un point de vente ou être marqué comme provenant du dépôt central.",
        });
        return;
      }
      const updated = yield model_1.Stock.findByIdAndUpdate(
        id,
        {
          produit,
          quantite,
          montant,
          pointVente,
          depotCentral,
        },
        { new: true },
      );
      if (!updated) {
        res.status(404).json({ message: "Stock non trouvé" });
        return;
      }
      res.json(updated);
      return;
    } catch (err) {
      res
        .status(400)
        .json({ message: "Erreur lors de la mise à jour", error: err });
      return;
    }
  });
exports.updateStock = updateStock;
// 🔹 Supprimer un stock
const deleteStock = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      yield model_1.Stock.findByIdAndDelete(id);
      res.json({ message: "Stock supprimé avec succès" });
      return;
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
      return;
    }
  });
exports.deleteStock = deleteStock;
// checkStock.ts
const checkStock = (_a) =>
  __awaiter(
    void 0,
    [_a],
    void 0,
    function* ({ type, produitId, regionId, pointVenteId, depotCentral }) {
      var _b;
      if (!mongoose_1.Types.ObjectId.isValid(produitId)) return 0;
      if (regionId && !mongoose_1.Types.ObjectId.isValid(regionId)) return 0;
      if (pointVenteId && !mongoose_1.Types.ObjectId.isValid(pointVenteId))
        return 0;
      const t = (type || "").toLowerCase();
      const query = { produit: produitId };
      // 1) Le central gagne toujours s’il est demandé
      if (depotCentral === true) {
        query.depotCentral = true;
      }
      // 2) Sinon, la région prime si présente (même si pointVenteId est aussi fourni)
      else if (regionId) {
        query.region = regionId;
        query.depotCentral = { $ne: true };
      }
      // 3) Sinon, le point de vente
      else if (pointVenteId) {
        query.pointVente = pointVenteId;
        query.depotCentral = { $ne: true };
      }
      // 4) Fallback: si aucune portée n’est donnée et type ∈ {livraison, vente, sortie} → central
      else if (t === "livraison" || t === "vente" || t === "sortie") {
        query.depotCentral = true;
      }
      // 5) Aucune portée exploitable
      else {
        return 0;
      }
      const stock = yield model_1.Stock.findOne(query).lean().exec();
      return Number(
        (_b = stock === null || stock === void 0 ? void 0 : stock.quantite) !==
          null && _b !== void 0
          ? _b
          : 0,
      );
    },
  );
exports.checkStock = checkStock;
// utils
const normId = (v) => {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && (v === null || v === void 0 ? void 0 : v._id))
    return String(v._id);
  return undefined;
};
// checkStockHandler.ts
const checkStockHandler = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { type, produitId, quantite } = req.body;
    // ⚠️ early return
    if (!type || !produitId || quantite == null) {
      res.status(400).json({ success: false, message: "Paramètres manquants" });
      return; // ✅ important
    }
    // normaliser/filtrer les scopes
    const depotCentral =
      req.body.depotCentral === true ||
      String(req.body.depotCentral).toLowerCase() === "true";
    const regionId = normId(req.body.regionId);
    const pointVenteId = normId(req.body.pointVenteId);
    // priorité unifiée côté API (le client ne peut plus forcer un mauvais scope)
    const scope = depotCentral
      ? { depotCentral: true }
      : regionId
        ? { regionId }
        : pointVenteId
          ? { pointVenteId }
          : undefined;
    try {
      const quantiteDisponible = yield (0, exports.checkStock)({
        type: type !== null && type !== void 0 ? type : "",
        produitId: produitId !== null && produitId !== void 0 ? produitId : "",
        regionId: scope === null || scope === void 0 ? void 0 : scope.regionId,
        pointVenteId:
          scope === null || scope === void 0 ? void 0 : scope.pointVenteId,
        depotCentral: !!(scope === null || scope === void 0
          ? void 0
          : scope.depotCentral),
      });
      res.json({
        success: true,
        quantiteDisponible,
        suffisant: quantiteDisponible >= Number(quantite),
      });
      return;
    } catch (e) {
      res.status(500).json({ success: false, message: "Erreur serveur" });
      return;
    }
  });
exports.checkStockHandler = checkStockHandler;
