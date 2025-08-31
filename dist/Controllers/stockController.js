"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStockHandler = exports.checkStock = exports.deleteStock = exports.updateStock = exports.createStock = exports.getStockById = exports.getStocksByPointVente = exports.getStocksByRegion = exports.getAllStocks = void 0;
const model_1 = require("../Models/model");
const mongoose_1 = require("mongoose");
const getIdStr = (v) => {
    var _a, _b, _c, _d;
    if (!v)
        return "";
    if (typeof v === "string")
        return v;
    if (typeof v === "object" && v._id) {
        const s = (_b = (_a = v._id).toString) === null || _b === void 0 ? void 0 : _b.call(_a);
        if (typeof s === "string")
            return s;
    }
    return (_d = (_c = v.toString) === null || _c === void 0 ? void 0 : _c.call(v)) !== null && _d !== void 0 ? _d : "";
};
const keyOf = (s) => {
    const prodId = getIdStr(s === null || s === void 0 ? void 0 : s.produit);
    const locId = getIdStr(s === null || s === void 0 ? void 0 : s.pointVente) || getIdStr(s === null || s === void 0 ? void 0 : s.region) || "DEPOT_CENTRAL";
    return `${prodId}|${locId}`;
};
const collapseLatest = (rows) => {
    // rows triées desc → le premier rencontré est le plus récent
    const seen = new Map();
    for (const r of rows) {
        const k = keyOf(r);
        if (!seen.has(k))
            seen.set(k, r);
    }
    return Array.from(seen.values());
};
/** ===========================================================
 * GET /stocks (tous)
 * - Tri par dernière modif
 * - Déduplication (dernier état par couple produit/emplacement)
 * =========================================================== */
const getAllStocks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.getAllStocks = getAllStocks;
/** ===========================================================
 * GET /stocks/region/:regionId
 * - Filtre région (région directe OU région du point de vente)
 * - Tri par dernière modif
 * - Déduplication (dernier état par couple produit/emplacement)
 * =========================================================== */
const getStocksByRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { regionId } = req.params;
        if (!regionId || !mongoose_1.Types.ObjectId.isValid(regionId)) {
            res.status(400).json({ message: "ID de région invalide" });
        }
        const regionObjId = new mongoose_1.Types.ObjectId(regionId);
        // 1) IDs des PV de la région (forcés en ObjectId)
        const pvIdsRaw = yield model_1.PointVente.find({ region: regionObjId }).distinct("_id");
        const pvIds = pvIdsRaw.map((id) => new mongoose_1.Types.ObjectId(id));
        // DEBUG utile
        console.log("[getStocksByRegion] regionId:", regionId, "pvIds:", pvIds);
        // 2) Requête: stocks régionaux OU stocks des PV de cette région
        const query = {
            $or: [{ region: regionObjId }],
        };
        if (pvIds.length > 0) {
            query.$or.push({ pointVente: { $in: pvIds } });
        }
        // 3) Lecture
        const stocks = yield model_1.Stock.find(query)
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
        // 4) Déduplication dernière version
        // @ts-ignore
        const uniques = collapseLatest(stocks);
        res.json(uniques);
    }
    catch (err) {
        console.error("getStocksByRegion error:", err);
        res.status(500).json({ message: "Erreur interne", error: err });
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
const getStocksByPointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.getStocksByPointVente = getStocksByPointVente;
/** ===========================================================
 * GET /stocks/:id (one)
 * - Inchangé : charge un document précis
 * =========================================================== */
const getStockById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.getStockById = getStockById;
// 🔹 Créer un stock
const createStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { produit, quantite, montant, pointVente, depotCentral } = req.body;
        if (!pointVente && depotCentral !== true) {
            res.status(400).json({
                message: "Un stock doit être associé à un point de vente ou être marqué comme provenant du dépôt central.",
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
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createStock = createStock;
// 🔹 Mettre à jour un stock
const updateStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { produit, quantite, montant, pointVente, depotCentral } = req.body;
        if (!pointVente && depotCentral !== true) {
            res.status(400).json({
                message: "Un stock doit être associé à un point de vente ou être marqué comme provenant du dépôt central.",
            });
            return;
        }
        const updated = yield model_1.Stock.findByIdAndUpdate(id, {
            produit,
            quantite,
            montant,
            pointVente,
            depotCentral,
        }, { new: true });
        if (!updated) {
            res.status(404).json({ message: "Stock non trouvé" });
            return;
        }
        res.json(updated);
    }
    catch (err) {
        res
            .status(400)
            .json({ message: "Erreur lors de la mise à jour", error: err });
    }
});
exports.updateStock = updateStock;
// 🔹 Supprimer un stock
const deleteStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield model_1.Stock.findByIdAndDelete(id);
        res.json({ message: "Stock supprimé avec succès" });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.deleteStock = deleteStock;
const checkStock = (_a) => __awaiter(void 0, [_a], void 0, function* ({ type, produitId, regionId, pointVenteId, depotCentral, }) {
    var _b;
    if (!mongoose_1.Types.ObjectId.isValid(produitId))
        return 0;
    if (regionId && !mongoose_1.Types.ObjectId.isValid(regionId))
        return 0;
    if (pointVenteId && !mongoose_1.Types.ObjectId.isValid(pointVenteId))
        return 0;
    // exclusivité : si central est explicitement demandé, on ignore PV/region
    if (depotCentral && (regionId || pointVenteId)) {
        // incohérent : l'appelant doit choisir UNE portée
        return 0;
    }
    const query = { produit: produitId };
    if (depotCentral === true) {
        // ✅ portée centrale explicite
        query.depotCentral = true;
    }
    else if (regionId) {
        // ✅ portée régionale (on exclut central)
        query.region = regionId;
        query.depotCentral = { $ne: true };
    }
    else if (pointVenteId) {
        // ✅ portée PV (on exclut central)
        query.pointVente = pointVenteId;
        query.depotCentral = { $ne: true };
    }
    else if (type === 'Livraison') {
        // ✅ fallback livraison -> central si rien n’est spécifié
        query.depotCentral = true;
    }
    else {
        // ❌ pas de portée exploitable
        return 0;
    }
    const stock = yield model_1.Stock.findOne(query).lean();
    return Number((_b = stock === null || stock === void 0 ? void 0 : stock.quantite) !== null && _b !== void 0 ? _b : 0);
});
exports.checkStock = checkStock;
const checkStockHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { type, produitId, quantite, pointVenteId, regionId, depotCentral } = req.body;
    // validations minimales
    if (!type || !produitId || quantite == null) {
        res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }
    // exclusivité : central vs (région | pv)
    if (depotCentral && (regionId || pointVenteId)) {
        res.status(400).json({
            success: false,
            message: 'Choisissez UNE portée: depotCentral OU regionId/pointVenteId.',
        });
    }
    // exclusivité région vs pv
    if (regionId && pointVenteId) {
        res.status(400).json({
            success: false,
            message: 'Fournir soit regionId, soit pointVenteId, pas les deux.',
        });
    }
    try {
        const quantiteDisponible = yield (0, exports.checkStock)({
            type,
            produitId,
            regionId,
            pointVenteId,
            depotCentral: !!depotCentral, // ✅ passe le flag
        });
        res.json({
            success: true,
            quantiteDisponible,
            suffisant: quantiteDisponible >= Number(quantite),
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
exports.checkStockHandler = checkStockHandler;
