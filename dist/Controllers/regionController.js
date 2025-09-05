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
exports.getRegionById = exports.deleteRegion = exports.updateRegion = exports.createRegion = exports.searchRegions = exports.getAllRegions = void 0;
const model_1 = require("../Models/model");
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
const getAllRegions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
        const q = (_a = req.query.q) === null || _a === void 0 ? void 0 : _a.trim();
        const ville = (_b = req.query.ville) === null || _b === void 0 ? void 0 : _b.trim();
        const sortBy = req.query.sortBy || "createdAt";
        const order = req.query.order === "asc" ? 1 : -1;
        const includeTotal = ((_c = req.query.includeTotal) !== null && _c !== void 0 ? _c : "true") === "true";
        // $match de base (sur champs de Region)
        const match = {};
        if (q)
            match.nom = { $regex: q, $options: "i" };
        if (ville)
            match.ville = { $regex: ville, $options: "i" };
        // pipeline commun
        const basePipeline = [
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
            const agg = yield model_1.Region.aggregate(pipeline);
            const data = (_e = (_d = agg === null || agg === void 0 ? void 0 : agg[0]) === null || _d === void 0 ? void 0 : _d.data) !== null && _e !== void 0 ? _e : [];
            const total = (_g = (_f = agg === null || agg === void 0 ? void 0 : agg[0]) === null || _f === void 0 ? void 0 : _f.total) !== null && _g !== void 0 ? _g : 0;
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
        }
        else {
            // pas de countDocuments
            const pipeline = [
                ...basePipeline,
                { $skip: (page - 1) * limit },
                { $limit: limit },
            ];
            const data = yield model_1.Region.aggregate(pipeline);
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
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllRegions = getAllRegions;
/**
 * GET /regions/search
 * Idem getAllRegions mais q est requis.
 */
const searchRegions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const q = (_a = req.query.q) === null || _a === void 0 ? void 0 : _a.trim();
    if (!q)
        res.status(400).json({ message: "Paramètre 'q' requis" });
    // On délègue à getAllRegions (qui sait gérer q) en gardant les mêmes query params
    (0, exports.getAllRegions)(req, res);
    return;
});
exports.searchRegions = searchRegions;
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
const updateRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { nom, ville } = req.body;
        const updated = yield model_1.Region.findByIdAndUpdate(id, { nom, ville }, { new: true, runValidators: true });
        if (!updated) {
            res.status(404).json({ message: "Région non trouvée" });
            return;
        }
        res.json(updated);
        return;
    }
    catch (err) {
        res
            .status(400)
            .json({ message: "Erreur lors de la mise à jour", error: err.message });
        return;
    }
});
exports.updateRegion = updateRegion;
const deleteRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield model_1.Region.findByIdAndDelete(id);
        res.json({ message: "Région supprimée avec succès" });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.deleteRegion = deleteRegion;
const getRegionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const region = yield model_1.Region.findById(id);
        if (!region) {
            res.status(404).json({ message: "Région non trouvée" });
            return;
        }
        res.json(region);
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.getRegionById = getRegionById;
