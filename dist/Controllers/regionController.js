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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRegion = exports.updateRegion = exports.createRegion = exports.getRegionById = exports.searchRegions = exports.getAllRegions = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../Models/model");
/** -------------------- Utils pagination/tri/filtre -------------------- */
const parsePagination = (req) => {
    var _a, _b;
    const page = Math.max(1, parseInt(String((_a = req.query.page) !== null && _a !== void 0 ? _a : "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String((_b = req.query.limit) !== null && _b !== void 0 ? _b : "10"), 10) || 10));
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || "createdAt"; // "nom" | "ville" | "pointVenteCount" | ...
    const order = (req.query.order || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sort = { [sortBy]: order };
    return { page, limit, skip, sort };
};
const buildSearchFilter = (req) => {
    const q = req.query.q || "";
    const ville = req.query.ville || "";
    const filter = {};
    const $and = [];
    if (q) {
        $and.push({
            $or: [
                { nom: { $regex: q, $options: "i" } },
                { ville: { $regex: q, $options: "i" } },
            ],
        });
    }
    if (ville) {
        $and.push({ ville: { $regex: ville, $options: "i" } });
    }
    if ($and.length)
        filter.$and = $and;
    return filter;
};
const paginationMeta = (page, limit, total) => {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { page, limit, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages };
};
/** -------------------- LISTE avec pagination/tri/filtres -------------------- */
const getAllRegions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { page, limit, skip, sort } = parsePagination(req);
        const filter = buildSearchFilter(req);
        const includeTotal = String((_a = req.query.includeTotal) !== null && _a !== void 0 ? _a : "true") !== "false";
        // pipeline avec lookup + count de points de vente
        const pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "pointventes", // ⚠️ nom de collection (minuscule/pluriel Mongo)
                    localField: "_id",
                    foreignField: "region",
                    as: "pointsVente",
                },
            },
            { $addFields: { pointVenteCount: { $size: "$pointsVente" } } },
            { $project: { nom: 1, ville: 1, pointVenteCount: 1 } },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
        ];
        const [data, total] = yield Promise.all([
            model_1.Region.aggregate(pipeline),
            includeTotal ? model_1.Region.countDocuments(filter) : Promise.resolve(-1),
        ]);
        res.json({
            data,
            meta: includeTotal ? paginationMeta(page, limit, total) : undefined,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllRegions = getAllRegions;
/** -------------------- RECHERCHE (mêmes query params) -------------------- */
const searchRegions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { page, limit, skip, sort } = parsePagination(req);
        const filter = buildSearchFilter(req);
        const includeTotal = String((_a = req.query.includeTotal) !== null && _a !== void 0 ? _a : "true") !== "false";
        const pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "pointventes",
                    localField: "_id",
                    foreignField: "region",
                    as: "pointsVente",
                },
            },
            { $addFields: { pointVenteCount: { $size: "$pointsVente" } } },
            { $project: { nom: 1, ville: 1, pointVenteCount: 1 } },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
        ];
        const [data, total] = yield Promise.all([
            model_1.Region.aggregate(pipeline),
            includeTotal ? model_1.Region.countDocuments(filter) : Promise.resolve(-1),
        ]);
        res.json({
            data,
            meta: includeTotal ? paginationMeta(page, limit, total) : undefined,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur lors de la recherche", error: err });
    }
});
exports.searchRegions = searchRegions;
/** -------------------- DÉTAIL -------------------- */
const getRegionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const rows = yield model_1.Region.aggregate([
            { $match: { _id: new mongoose_1.default.Types.ObjectId(id) } },
            {
                $lookup: {
                    from: "pointventes",
                    localField: "_id",
                    foreignField: "region",
                    as: "pointsVente",
                },
            },
            { $addFields: { pointVenteCount: { $size: "$pointsVente" } } },
            { $project: { nom: 1, ville: 1, pointVenteCount: 1 } },
        ]);
        const region = rows === null || rows === void 0 ? void 0 : rows[0];
        if (!region) {
            res.status(404).json({ message: "Région non trouvée" });
            return;
        }
        res.json(region);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getRegionById = getRegionById;
/** -------------------- CRÉATION -------------------- */
const createRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { nom, ville } = req.body;
        const region = new model_1.Region({ nom, ville });
        yield region.save();
        res.status(201).json(region);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createRegion = createRegion;
/** -------------------- MISE À JOUR -------------------- */
const updateRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const { nom, ville } = req.body;
        const updated = yield model_1.Region.findByIdAndUpdate(id, { nom, ville }, { new: true, runValidators: true });
        if (!updated) {
            res.status(404).json({ message: "Région non trouvée" });
            return;
        }
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la mise à jour", error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err });
    }
});
exports.updateRegion = updateRegion;
/** -------------------- SUPPRESSION (cascade + fallback sans transaction) -------------------- */
function cascadeDeleteRegion(regionId, session) {
    return __awaiter(this, void 0, void 0, function* () {
        // Vérifie existence
        const exists = yield (session ? model_1.Region.findById(regionId).session(session) : model_1.Region.findById(regionId));
        if (!exists)
            return "NOT_FOUND";
        // Récupère les points de vente de la région
        const pvs = yield (session
            ? model_1.PointVente.find({ region: regionId }).select("_id").session(session)
            : model_1.PointVente.find({ region: regionId }).select("_id"));
        const pvIds = pvs.map((p) => p._id);
        // Supprime dépendances liées aux PV (ajuste les champs selon tes schémas)
        const pvOrs = [
            { pointVente: { $in: pvIds } },
            { point_vente: { $in: pvIds } },
            { pointDeVente: { $in: pvIds } },
            { pos: { $in: pvIds } },
        ];
        yield (model_1.MouvementStock === null || model_1.MouvementStock === void 0 ? void 0 : model_1.MouvementStock.deleteMany({ $or: pvOrs }, { session }).catch(() => Promise.resolve()));
        // Supprime les points de vente
        yield (model_1.PointVente === null || model_1.PointVente === void 0 ? void 0 : model_1.PointVente.deleteMany({ region: regionId }, { session }).catch(() => Promise.resolve()));
        // Supprime la région
        if (session) {
            yield model_1.Region.findByIdAndDelete(regionId, { session });
        }
        else {
            yield model_1.Region.findByIdAndDelete(regionId);
        }
        return "DELETED";
    });
}
const deleteRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "ID invalide" });
        return;
    }
    const session = yield mongoose_1.default.startSession();
    try {
        // Essai en transaction (si replica set actif)
        yield session.withTransaction(() => __awaiter(void 0, void 0, void 0, function* () {
            const r = yield cascadeDeleteRegion(id, session);
            if (r === "NOT_FOUND")
                throw { status: 404, message: "Région non trouvée" };
        }));
        res.json({ message: "Région supprimée avec succès (cascade en transaction)" });
    }
    catch (err) {
        // Fallback si standalone (code 20)
        const isNoTxn = (err === null || err === void 0 ? void 0 : err.code) === 20 ||
            /Transaction numbers are only allowed/.test(String(err === null || err === void 0 ? void 0 : err.message));
        if (isNoTxn) {
            try {
                const r = yield cascadeDeleteRegion(id); // sans session
                if (r === "NOT_FOUND") {
                    res.status(404).json({ message: "Région non trouvée" });
                    return;
                }
                res.json({ message: "Région supprimée avec succès (cascade sans transaction)" });
                return;
            }
            catch (e2) {
                res.status(500).json({
                    message: "Erreur lors de la suppression (fallback)",
                    error: (_a = e2 === null || e2 === void 0 ? void 0 : e2.message) !== null && _a !== void 0 ? _a : e2,
                });
                return;
            }
        }
        const status = (_b = err === null || err === void 0 ? void 0 : err.status) !== null && _b !== void 0 ? _b : 500;
        const message = (_c = err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : "Erreur interne lors de la suppression";
        res.status(status).json({ message, error: err });
    }
    finally {
        session.endSession();
    }
});
exports.deleteRegion = deleteRegion;
