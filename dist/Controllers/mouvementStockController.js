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
exports.aggregateMouvements = exports.validateState = exports.deleteMouvementStock = exports.updateMouvementStock = exports.createMouvementStock = exports.getMouvementStockById = exports.searchMouvementsStock = exports.getAllMouvementsStock = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../Models/model");
/* ---------------------------------- Utils --------------------------------- */
const toBool = (v, d = false) => {
    if (typeof v === "boolean")
        return v;
    if (typeof v === "string")
        return v.toLowerCase() === "true";
    return d;
};
const parsePagination = (req) => {
    var _a, _b;
    const page = Math.max(1, parseInt(String((_a = req.query.page) !== null && _a !== void 0 ? _a : "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String((_b = req.query.limit) !== null && _b !== void 0 ? _b : "10"), 10) || 10));
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || "createdAt";
    const order = (req.query.order || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sort = { [sortBy]: order };
    return { page, limit, skip, sort, sortBy, order };
};
const paginationMeta = (page, limit, total) => {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { page, limit, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages };
};
const basePopulate = [
    { path: "region" },
    { path: "pointVente", populate: { path: "region", model: "Region" } },
    { path: "produit", populate: { path: "categorie", model: "Categorie" } },
    { path: "user", populate: [{ path: "pointVente", model: "PointVente" }, { path: "region", model: "Region" }] },
];
/**
 * Construit le filtre Mongo à partir des query params.
 * - region : inclut les mouvements liés à cette région OU à un PV de cette région
 * - pointVente / user / produit : filtrage direct par ObjectId
 * - q : regex sur "type"
 * - statut / depotCentral : booléens
 * - dateFrom/dateTo : intervalle sur createdAt
 */
function buildFilter(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const { q, region, pointVente, user, produit, type, statut, depotCentral, dateFrom, dateTo, } = req.query;
        const filter = {};
        const and = [];
        if (q) {
            and.push({ type: { $regex: q, $options: "i" } });
        }
        if (type) {
            and.push({ type });
        }
        if (statut !== undefined) {
            and.push({ statut: toBool(statut) });
        }
        if (depotCentral !== undefined) {
            and.push({ depotCentral: toBool(depotCentral) });
        }
        if (pointVente && mongoose_1.default.Types.ObjectId.isValid(pointVente)) {
            and.push({ pointVente: new mongoose_1.default.Types.ObjectId(pointVente) });
        }
        if (user && mongoose_1.default.Types.ObjectId.isValid(user)) {
            and.push({ user: new mongoose_1.default.Types.ObjectId(user) });
        }
        if (produit && mongoose_1.default.Types.ObjectId.isValid(produit)) {
            and.push({ produit: new mongoose_1.default.Types.ObjectId(produit) });
        }
        // date range
        if (dateFrom || dateTo) {
            const createdAt = {};
            if (dateFrom)
                createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const d = new Date(dateTo);
                // inclut la journée complète
                createdAt.$lte = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
            }
            and.push({ createdAt });
        }
        // region: match direct région OU PV appartenant à la région
        if (region && mongoose_1.default.Types.ObjectId.isValid(region)) {
            const pvIds = yield model_1.PointVente.find({ region: region }, { _id: 1 }).lean();
            const idList = pvIds.map((p) => p._id);
            and.push({
                $or: [
                    { region: new mongoose_1.default.Types.ObjectId(region) },
                    ...(idList.length ? [{ pointVente: { $in: idList } }] : []),
                ],
            });
        }
        if (and.length)
            filter.$and = and;
        return filter;
    });
}
/* -------------------------------- Handlers -------------------------------- */
/**
 * GET /mouvements
 * Query: page, limit, sortBy, order, q, region, pointVente, user, produit, type, statut, depotCentral, dateFrom, dateTo
 *        includeTotal (default true), includeRefs (default true)
 */
const getAllMouvementsStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { page, limit, skip, sort } = parsePagination(req);
        const includeTotal = String((_a = req.query.includeTotal) !== null && _a !== void 0 ? _a : "true") !== "false";
        const includeRefs = String((_b = req.query.includeRefs) !== null && _b !== void 0 ? _b : "true") !== "false";
        const filter = yield buildFilter(req);
        let query = model_1.MouvementStock.find(filter).sort(sort).skip(skip).limit(limit);
        if (includeRefs) {
            for (const p of basePopulate)
                query = query.populate(p);
        }
        const [data, total] = yield Promise.all([
            query.exec(),
            includeTotal ? model_1.MouvementStock.countDocuments(filter) : Promise.resolve(-1),
        ]);
        res.json({ data, meta: includeTotal ? paginationMeta(page, limit, total) : undefined });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllMouvementsStock = getAllMouvementsStock;
/** Alias /search (mêmes query params) */
const searchMouvementsStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, exports.getAllMouvementsStock)(req, res);
});
exports.searchMouvementsStock = searchMouvementsStock;
/** GET /mouvements/:id?includeRefs=true */
const getMouvementStockById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const includeRefs = String((_a = req.query.includeRefs) !== null && _a !== void 0 ? _a : "true") !== "false";
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        let q = model_1.MouvementStock.findById(id);
        if (includeRefs) {
            for (const p of basePopulate)
                q = q.populate(p);
        }
        const mouvement = yield q.exec();
        if (!mouvement) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        res.json(mouvement);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getMouvementStockById = getMouvementStockById;
/** POST /mouvements */
const createMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { pointVente, depotCentral, produit, type, quantite, montant, statut, region, user, } = req.body;
        const hasPV = !!pointVente;
        const hasRegion = !!region;
        const hasDepot = toBool(depotCentral, false);
        if (!user) {
            res.status(400).json({ message: "L'utilisateur est requis" });
            return;
        }
        if (!hasPV && !hasRegion && !hasDepot) {
            res.status(400).json({
                message: "Le mouvement doit être associé à un point de vente, une région ou un dépôt central",
            });
            return;
        }
        const payload = {
            produit,
            type,
            quantite,
            montant,
            statut: !!statut,
            user,
            depotCentral: hasDepot,
        };
        if (hasPV)
            payload.pointVente = pointVente;
        if (hasRegion)
            payload.region = region;
        const mouvement = yield model_1.MouvementStock.create(payload);
        let created = model_1.MouvementStock.findById(mouvement._id);
        for (const p of basePopulate)
            created = created.populate(p);
        res.status(201).json(yield created.exec());
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err });
    }
});
exports.createMouvementStock = createMouvementStock;
/** PUT /mouvements/:id */
const updateMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const { pointVente, depotCentral, produit, type, quantite, montant, statut, region, user, } = req.body;
        const hasPV = !!pointVente;
        const hasRegion = !!region;
        const hasDepot = toBool(depotCentral, false);
        if (!user) {
            res.status(400).json({ message: "L'utilisateur est requis" });
            return;
        }
        if (!hasPV && !hasRegion && !hasDepot) {
            res.status(400).json({
                message: "Le mouvement doit être associé à un point de vente, une région ou un dépôt central",
            });
            return;
        }
        const update = {
            produit,
            type,
            quantite,
            montant,
            statut: !!statut,
            user,
            depotCentral: hasDepot,
        };
        if (hasPV)
            update.pointVente = pointVente;
        else
            update.pointVente = undefined;
        if (hasRegion)
            update.region = region;
        else
            update.region = undefined;
        let updated = yield model_1.MouvementStock.findByIdAndUpdate(id, update, {
            new: true,
            runValidators: true,
        });
        if (!updated) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        let q = model_1.MouvementStock.findById(updated._id);
        for (const p of basePopulate)
            q = q.populate(p);
        res.json(yield q.exec());
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la mise à jour", error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err });
    }
});
exports.updateMouvementStock = updateMouvementStock;
/** DELETE /mouvements/:id */
const deleteMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        yield model_1.MouvementStock.findByIdAndDelete(id);
        res.json({ message: "Mouvement supprimé avec succès" });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.deleteMouvementStock = deleteMouvementStock;
/** PATCH /mouvements/:id/validate -> statut = true */
const validateState = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        let mvt = yield model_1.MouvementStock.findByIdAndUpdate(id, { statut: true }, { new: true });
        if (!mvt) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        let q = model_1.MouvementStock.findById(mvt._id);
        for (const p of basePopulate)
            q = q.populate(p);
        mvt = yield q.exec();
        res.json({ message: "Statut du mouvement mis à jour", mouvement: mvt });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur lors de la validation", error: err });
    }
});
exports.validateState = validateState;
/* ------------------------------ Aggregations ------------------------------- */
/**
 * GET /mouvements/aggregate
 * Params:
 *   groupBy: "produit" | "produit_type"   (par défaut "produit")
 *   page, limit (pagination)
 *   + mêmes filtres que listing: region, pointVente, user, produit, type, statut, depotCentral, dateFrom, dateTo
 *
 * Renvoie: { data: [...], meta }
 * - groupBy=produit       => totalQuantite, totalMontant, count par produit
 * - groupBy=produit_type  => totalQuantite, totalMontant, count par (produit, type)
 */
const aggregateMouvements = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const groupBy = req.query.groupBy || "produit";
        const { page, limit, skip } = parsePagination(req);
        const filter = yield buildFilter(req);
        const groupId = groupBy === "produit_type"
            ? { produit: "$produit", type: "$type" }
            : { produit: "$produit" };
        const pipeline = [
            { $match: filter },
            {
                $group: {
                    _id: groupId,
                    totalQuantite: { $sum: "$quantite" },
                    totalMontant: { $sum: "$montant" },
                    count: { $sum: 1 },
                },
            },
            {
                $project: Object.assign(Object.assign({ _id: 0, produit: "$_id.produit" }, (groupBy === "produit_type" ? { type: "$_id.type" } : {})), { totalQuantite: 1, totalMontant: 1, count: 1 }),
            },
            // tri par nom de produit après lookup
            {
                $lookup: {
                    from: "produits",
                    localField: "produit",
                    foreignField: "_id",
                    as: "produitInfo",
                },
            },
            { $unwind: "$produitInfo" },
            {
                $lookup: {
                    from: "categories",
                    localField: "produitInfo.categorie",
                    foreignField: "_id",
                    as: "categorieInfo",
                },
            },
            { $unwind: { path: "$categorieInfo", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    "produitInfo.categorie": "$categorieInfo",
                },
            },
            { $sort: Object.assign({ "produitInfo.nom": 1 }, (groupBy === "produit_type" ? { type: 1 } : {})) },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }],
                },
            },
        ];
        const result = yield model_1.MouvementStock.aggregate(pipeline);
        const metadata = (_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.metadata) !== null && _b !== void 0 ? _b : [];
        const total = metadata.length ? metadata[0].total : 0;
        const data = ((_d = (_c = result[0]) === null || _c === void 0 ? void 0 : _c.data) !== null && _d !== void 0 ? _d : []).map((row) => {
            var _a, _b, _c, _d, _e;
            return (Object.assign(Object.assign({ produit: {
                    _id: (_a = row.produitInfo) === null || _a === void 0 ? void 0 : _a._id,
                    nom: (_b = row.produitInfo) === null || _b === void 0 ? void 0 : _b.nom,
                    code: (_c = row.produitInfo) === null || _c === void 0 ? void 0 : _c.code,
                    categorie: (_e = (_d = row.produitInfo) === null || _d === void 0 ? void 0 : _d.categorie) !== null && _e !== void 0 ? _e : null,
                } }, (groupBy === "produit_type" ? { type: row.type } : {})), { totalQuantite: row.totalQuantite, totalMontant: row.totalMontant, count: row.count }));
        });
        res.json({ data, meta: paginationMeta(page, limit, total) });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur agrégation", error: err });
    }
});
exports.aggregateMouvements = aggregateMouvements;
