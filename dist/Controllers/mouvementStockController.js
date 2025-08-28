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
exports.livrerProduitCommande = exports.getMouvementsStockAggregatedByPointVente = exports.getMouvementsStockAggregatedByUserId = exports.validateState = exports.deleteMouvementStock = exports.updateMouvementStock = exports.createMouvementStock = exports.getMouvementsStockByUserId = exports.getMouvementStockByRegion = exports.getMouvementsStockByPointVenteId = exports.getMouvementsStockByPointVente = exports.getMouvementStockById = exports.getMouvementsStockByPointVentePage = exports.getMouvementStockByRegionPage = exports.getAllMouvementsStock = exports.getAllMouvementsStockPage = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../Models/model");
// GET /mouvements/page
const getAllMouvementsStockPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const page = parseIntSafe(req.query.page, 1);
        const limit = parseIntSafe(req.query.limit, 10);
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || "createdAt";
        const order = sortDir(req.query.order);
        const q = req.query.q || "";
        // 1) portée + filtres
        const scope = buildScope(req);
        const match = applyBusinessFilters(scope, req);
        // 2) stratégie
        if (mustUseAggregate(sortBy, q)) {
            const pipeline = buildAggregatePipeline(match, {
                q,
                sortBy,
                order,
                skip,
                limit,
            });
            const result = yield model_1.MouvementStock.aggregate(pipeline);
            const data = (_b = (_a = result === null || result === void 0 ? void 0 : result[0]) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : [];
            const total = (_f = (_e = (_d = (_c = result === null || result === void 0 ? void 0 : result[0]) === null || _c === void 0 ? void 0 : _c.metadata) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.total) !== null && _f !== void 0 ? _f : 0;
            sendPaged(res, { total, page, limit, mouvements: data });
            return;
        }
        // 3) find() + populate
        const total = yield model_1.MouvementStock.countDocuments(match);
        const mouvements = yield populateAll(model_1.MouvementStock.find(match)
            .sort({ [sortBy]: order })
            .skip(skip)
            .limit(limit));
        sendPaged(res, { total, page, limit, mouvements });
        return;
    }
    catch (err) {
        const status = (_g = err === null || err === void 0 ? void 0 : err.status) !== null && _g !== void 0 ? _g : 500;
        res
            .status(status)
            .json({ message: "Erreur interne", error: (_h = err === null || err === void 0 ? void 0 : err.message) !== null && _h !== void 0 ? _h : err });
        return;
    }
});
exports.getAllMouvementsStockPage = getAllMouvementsStockPage;
/* --------------------------- LISTE NON PAGINÉE ---------------------------- */
/* ⚠️ Déconseillé. On redirige vers la version paginée pour éviter le “tout”. */
const getAllMouvementsStock = (req, res) => (0, exports.getAllMouvementsStockPage)(req, res);
exports.getAllMouvementsStock = getAllMouvementsStock;
/* ------------------------------ PAR RÉGION ------------------------------- */
// GET /mouvements/by-region/:regionId/page
const getMouvementStockByRegionPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { regionId } = req.params;
        if (!regionId)
            return res.status(400).json({ message: "regionId requis" });
        // Sécurité d’accès
        yield assertCanAccessRegion(req, regionId);
        // proxy vers global avec filter region
        req.query.region = regionId;
        (0, exports.getAllMouvementsStockPage)(req, res);
        return;
    }
    catch (err) {
        const status = (_a = err === null || err === void 0 ? void 0 : err.status) !== null && _a !== void 0 ? _a : 500;
        res.status(status).json({ message: (_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : "Erreur interne" });
        return;
    }
});
exports.getMouvementStockByRegionPage = getMouvementStockByRegionPage;
/* --------------------------- PAR POINT DE VENTE --------------------------- */
// GET /mouvements/by-point-vente/:pointVenteId/page
const getMouvementsStockByPointVentePage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { pointVenteId } = req.params;
        if (!pointVenteId)
            return res.status(400).json({ message: "pointVenteId requis" });
        // Sécurité d’accès
        yield assertCanAccessPointVente(req, pointVenteId);
        // proxy vers global avec filter pointVente
        req.query.pointVente = pointVenteId;
        (0, exports.getAllMouvementsStockPage)(req, res);
        return;
    }
    catch (err) {
        const status = (_a = err === null || err === void 0 ? void 0 : err.status) !== null && _a !== void 0 ? _a : 500;
        res.status(status).json({ message: (_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : "Erreur interne" });
        return;
    }
});
exports.getMouvementsStockByPointVentePage = getMouvementsStockByPointVentePage;
const toId = (v) => { var _a; return v ? new mongoose_1.default.Types.ObjectId(String((_a = v === null || v === void 0 ? void 0 : v._id) !== null && _a !== void 0 ? _a : v)) : undefined; };
const parseIntSafe = (v, d) => {
    const n = Number.parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : d;
};
const parseBool = (v) => {
    if (v === true || v === "true" || v === "1" || v === 1)
        return true;
    if (v === false || v === "false" || v === "0" || v === 0)
        return false;
    return undefined;
};
const sortDir = (order) => String(order).toLowerCase() === "asc" ? 1 : -1;
const isSuperAdmin = (req) => { var _a, _b; return String((_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== null && _b !== void 0 ? _b : "").toLowerCase() === "superadmin"; };
const getUserIds = (req) => {
    var _a, _b, _c;
    return ({
        userId: toId((_a = req.user) === null || _a === void 0 ? void 0 : _a._id),
        pvId: toId((_b = req.user) === null || _b === void 0 ? void 0 : _b.pointVente),
        rgId: toId((_c = req.user) === null || _c === void 0 ? void 0 : _c.region),
    });
};
/** Construit la clause de portée selon le rôle + query (priorité PV→Region→User). */
function buildScope(req) {
    const q = {};
    const { pvId, rgId, userId } = getUserIds(req);
    // Overrides de la query (uniquement si SuperAdmin)
    const qPV = toId(req.query.pointVente);
    const qRG = toId(req.query.region);
    const qUS = toId(req.query.user);
    if (isSuperAdmin(req)) {
        if (qPV)
            q.pointVente = qPV;
        else if (qRG)
            q.region = qRG;
        else if (qUS)
            q.user = qUS;
        return q;
    }
    // Non-SuperAdmin → on impose une portée
    if (qPV)
        q.pointVente = qPV;
    else if (qRG)
        q.region = qRG;
    else if (qUS)
        q.user = qUS;
    else if (pvId)
        q.pointVente = pvId;
    else if (rgId)
        q.region = rgId;
    else if (userId)
        q.user = userId;
    return q;
}
/** Filtres fonctionnels additionnels. */
function applyBusinessFilters(base, req) {
    const out = Object.assign({}, base);
    if (req.query.produit)
        out.produit = toId(req.query.produit);
    if (req.query.type)
        out.type = String(req.query.type);
    const st = parseBool(req.query.statut);
    if (typeof st === "boolean")
        out.statut = st;
    const depot = parseBool(req.query.depotCentral);
    if (typeof depot === "boolean")
        out.depotCentral = depot;
    // Date range (createdAt)
    const dateFrom = req.query.dateFrom
        ? new Date(String(req.query.dateFrom))
        : undefined;
    const dateTo = req.query.dateTo
        ? new Date(String(req.query.dateTo))
        : undefined;
    if (dateFrom || dateTo) {
        out.createdAt = {};
        if (dateFrom && !Number.isNaN(+dateFrom))
            out.createdAt.$gte = dateFrom;
        if (dateTo && !Number.isNaN(+dateTo))
            out.createdAt.$lte = dateTo;
    }
    return out;
}
/** Populate commun */
function populateAll(q) {
    return q
        .populate("region")
        .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
    })
        .populate({
        path: "produit",
        populate: { path: "categorie", model: "Categorie" },
    })
        .populate({
        path: "user",
        populate: [
            { path: "pointVente", model: "PointVente" },
            { path: "region", model: "Region" },
        ],
    });
}
/** Vérifie accès à une région pour non-SuperAdmin. */
function assertCanAccessRegion(req, regionId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (isSuperAdmin(req))
            return;
        const allowed = toId((_a = req.user) === null || _a === void 0 ? void 0 : _a.region);
        if (!allowed || String(allowed) !== String(toId(regionId))) {
            throw { status: 403, message: "Accès refusé à cette région." };
        }
    });
}
/** Vérifie accès à un PV pour non-SuperAdmin. */
function assertCanAccessPointVente(req, pointVenteId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (isSuperAdmin(req))
            return;
        const userPV = toId((_a = req.user) === null || _a === void 0 ? void 0 : _a.pointVente);
        const userRG = toId((_b = req.user) === null || _b === void 0 ? void 0 : _b.region);
        const pv = yield model_1.PointVente.findById(toId(pointVenteId))
            .select("region")
            .lean();
        if (!pv)
            throw { status: 404, message: "Point de vente introuvable." };
        if (userPV && String(userPV) === String(pv._id))
            return; // AdminPointVente
        if (userRG && String(userRG) === String(pv.region))
            return; // AdminRegion
        throw { status: 403, message: "Accès PV refusé." };
    });
}
/** Vérifie accès à un userId (soi-même si non-SuperAdmin). */
function assertCanAccessUser(req, targetUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (isSuperAdmin(req))
            return;
        const self = toId((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        if (!self || String(self) !== String(toId(targetUserId))) {
            throw { status: 403, message: "Accès utilisateur refusé." };
        }
    });
}
/** Aggregate obligatoire si tri sur champ imbriqué ou recherche q. */
function mustUseAggregate(sortBy, q) {
    return Boolean(q) || (sortBy && sortBy.includes("."));
}
/** Pipeline aggregate (recherche sur produit.nom + tri nested). */
function buildAggregatePipeline(match, { q, sortBy, order, skip, limit, }) {
    const pipeline = [{ $match: match }];
    pipeline.push({
        $lookup: {
            from: "produits",
            localField: "produit",
            foreignField: "_id",
            as: "produit",
        },
    }, { $unwind: "$produit" }, {
        $lookup: {
            from: "categories",
            localField: "produit.categorie",
            foreignField: "_id",
            as: "produit.categorie",
        },
    }, {
        $unwind: { path: "$produit.categorie", preserveNullAndEmptyArrays: true },
    }, {
        $lookup: {
            from: "regions",
            localField: "region",
            foreignField: "_id",
            as: "region",
        },
    }, { $unwind: { path: "$region", preserveNullAndEmptyArrays: true } }, {
        $lookup: {
            from: "pointventes",
            localField: "pointVente",
            foreignField: "_id",
            as: "pointVente",
        },
    }, { $unwind: { path: "$pointVente", preserveNullAndEmptyArrays: true } }, {
        $lookup: {
            from: "regions",
            localField: "pointVente.region",
            foreignField: "_id",
            as: "pointVente.region",
        },
    }, {
        $unwind: { path: "$pointVente.region", preserveNullAndEmptyArrays: true },
    }, {
        $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
        },
    }, { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } });
    if (q) {
        pipeline.push({ $match: { "produit.nom": { $regex: q, $options: "i" } } });
    }
    const sortField = sortBy && sortBy.length ? sortBy : "createdAt";
    pipeline.push({ $sort: { [sortField]: order } });
    pipeline.push({
        $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: skip }, { $limit: limit }],
        },
    });
    return pipeline;
}
/** Réponse paginée standard (void) */
function sendPaged(res, { total, page, limit, mouvements, }) {
    res.json({
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
        limit,
        mouvements,
    });
}
/* -------------------------------------------------------------------------- */
/*                                   ROUTES                                   */
const getMouvementStockById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { id } = req.params;
        const mv = yield populateAll(model_1.MouvementStock.findById(id));
        if (!mv) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        // contrôle d’accès au doc isolé
        const scope = buildScope(req);
        if (!isSuperAdmin(req) &&
            !((scope.pointVente &&
                String(scope.pointVente) === String((_a = mv.pointVente) === null || _a === void 0 ? void 0 : _a._id)) ||
                (scope.region && String(scope.region) === String((_b = mv.region) === null || _b === void 0 ? void 0 : _b._id)) ||
                (scope.user && String(scope.user) === String((_c = mv.user) === null || _c === void 0 ? void 0 : _c._id)))) {
            res.status(403).json({ message: "Accès refusé" });
            return;
        }
        res.json(mv);
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.getMouvementStockById = getMouvementStockById;
/* --------------------------- PAR POINT DE VENTE --------------------------- */
// GET "/by-point-vente/:pointVenteId"  (legacy non paginé → on renvoie paginé qd même)
const getMouvementsStockByPointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { pointVenteId } = req.params;
        if (!pointVenteId) {
            res.status(400).json({ message: "ID requis" });
            return;
        }
        yield assertCanAccessPointVente(req, pointVenteId);
        req.query.pointVente = pointVenteId;
        yield (0, exports.getAllMouvementsStock)(req, res);
        return;
    }
    catch (err) {
        res
            .status((_a = err === null || err === void 0 ? void 0 : err.status) !== null && _a !== void 0 ? _a : 500)
            .json({ message: (_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : "Erreur interne" });
        return;
    }
});
exports.getMouvementsStockByPointVente = getMouvementsStockByPointVente;
// GET "/by-point-vente/page/:pointVenteId" (paginé)
const getMouvementsStockByPointVenteId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { pointVenteId } = req.params;
        if (!pointVenteId) {
            res.status(400).json({ message: "ID requis" });
            return;
        }
        yield assertCanAccessPointVente(req, pointVenteId);
        req.query.pointVente = pointVenteId;
        yield (0, exports.getAllMouvementsStock)(req, res);
        return;
    }
    catch (err) {
        res
            .status((_a = err === null || err === void 0 ? void 0 : err.status) !== null && _a !== void 0 ? _a : 500)
            .json({ message: (_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : "Erreur interne" });
        return;
    }
});
exports.getMouvementsStockByPointVenteId = getMouvementsStockByPointVenteId;
/* ----------------------------------- RÉGION -------------------------------- */
// GET "/region/:regionId"
// petit helper pour parser les bools depuis la query
const toBool = (v, def = false) => v === true || v === "true" || v === "1"
    ? true
    : v === false || v === "false" || v === "0"
        ? false
        : def;
const getMouvementStockByRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { regionId } = req.params;
        if (!regionId || !mongoose_1.default.isValidObjectId(regionId)) {
            res.status(400).json({ message: "regionId requis ou invalide" });
            return;
        }
        // Autorisation : l'utilisateur peut-il accéder à cette région ?
        yield assertCanAccessRegion(req, regionId);
        // --- pagination & tri ---
        const page = Math.max(parseInt(String((_a = req.query.page) !== null && _a !== void 0 ? _a : "1"), 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(String((_b = req.query.limit) !== null && _b !== void 0 ? _b : "20"), 10) || 20, 1), 200); // borne haute pour éviter les abus
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || "createdAt";
        const order = (req.query.order || "desc").toLowerCase() === "asc" ? 1 : -1;
        const includeRefs = toBool(req.query.includeRefs, true);
        const includeTotal = toBool(req.query.includeTotal, false);
        // --- autres filtres éventuels (dates, type, produit, user, etc.) ---
        // On reconstruit un filtre "neutre" depuis la query en ignorant 'region' et 'pointVente'
        // pour éviter de casser la logique OR qu'on va ajouter.
        const baseFilter = {};
        // Exemple de filtres usuels (adapte selon ton buildFilter si tu en as un)
        if (req.query.type)
            baseFilter.type = req.query.type;
        if (req.query.produit) {
            const pid = String(req.query.produit);
            if (mongoose_1.default.isValidObjectId(pid))
                baseFilter.produit = new mongoose_1.default.Types.ObjectId(pid);
        }
        // Filtre par période (createdAt)
        const createdAt = {};
        if (req.query.dateFrom)
            createdAt.$gte = new Date(String(req.query.dateFrom));
        if (req.query.dateTo)
            createdAt.$lte = new Date(String(req.query.dateTo));
        if (Object.keys(createdAt).length)
            baseFilter.createdAt = createdAt;
        // --- récupère les PV de la région ---
        const pointVenteIds = yield model_1.PointVente.find({
            region: new mongoose_1.default.Types.ObjectId(regionId),
        }).distinct("_id");
        // --- filtre final: mouvements dont region == regionId OU pointVente ∈ PV(regionId) ---
        const regionOrPVFilter = {
            $or: [
                { region: new mongoose_1.default.Types.ObjectId(regionId) },
                { pointVente: { $in: pointVenteIds } },
            ],
        };
        const finalFilter = { $and: [baseFilter, regionOrPVFilter] };
        // --- requête ---
        let query = model_1.MouvementStock.find(finalFilter)
            .sort({ [sortBy]: order })
            .skip(skip)
            .limit(limit)
            .lean();
        if (includeRefs) {
            query = query
                .populate({
                path: "produit",
                populate: { path: "categorie", model: "Categorie" },
            })
                .populate({
                path: "pointVente",
                populate: { path: "region", model: "Region" },
            })
                .populate("region")
                .populate("user")
                .populate("commandeId");
        }
        const execList = query.exec();
        const execCount = includeTotal
            ? model_1.MouvementStock.countDocuments(finalFilter)
            : null;
        const [items, total] = yield Promise.all([execList, execCount]);
        if (includeTotal) {
            res.json({
                items,
                total,
                page,
                limit,
                sortBy,
                order: order === 1 ? "asc" : "desc",
            });
            return;
        }
        res.json(items);
        return;
    }
    catch (err) {
        res
            .status((_c = err === null || err === void 0 ? void 0 : err.status) !== null && _c !== void 0 ? _c : 500)
            .json({ message: (_d = err === null || err === void 0 ? void 0 : err.message) !== null && _d !== void 0 ? _d : "Erreur interne" });
        return;
    }
});
exports.getMouvementStockByRegion = getMouvementStockByRegion;
/* ----------------------------------- USER --------------------------------- */
// GET "/byUser/:userId"
const getMouvementsStockByUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { userId } = req.params;
        if (!userId) {
            res.status(400).json({ message: "ID utilisateur requis" });
            return;
        }
        yield assertCanAccessUser(req, userId);
        req.query.user = userId;
        yield (0, exports.getAllMouvementsStock)(req, res);
        return;
    }
    catch (err) {
        res
            .status((_a = err === null || err === void 0 ? void 0 : err.status) !== null && _a !== void 0 ? _a : 500)
            .json({ message: (_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : "Erreur interne" });
        return;
    }
});
exports.getMouvementsStockByUserId = getMouvementsStockByUserId;
/* ----------------------------- CREATE / UPDATE ---------------------------- */
// POST "/"
const createMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { pointVente, depotCentral, produit, type, quantite, montant, statut, region, user, } = req.body;
        const hasPV = !!pointVente;
        const hasRG = !!region;
        const hasDC = depotCentral === true;
        if (!hasPV && !hasRG && !hasDC) {
            res
                .status(400)
                .json({
                message: "Associer un point de vente, une région ou le dépôt central.",
            });
            return;
        }
        if (!user) {
            res.status(400).json({ message: "L'utilisateur est requis" });
            return;
        }
        const mouvementData = {
            produit,
            type,
            quantite,
            montant,
            statut,
            user,
            depotCentral: !!depotCentral,
        };
        if (pointVente)
            mouvementData.pointVente = toId(pointVente);
        if (region)
            mouvementData.region = toId(region);
        const mouvement = yield new model_1.MouvementStock(mouvementData).save();
        const populated = yield populateAll(model_1.MouvementStock.findById(mouvement._id));
        res.status(201).json(populated);
        return;
    }
    catch (err) {
        res
            .status(400)
            .json({
            message: "Erreur lors de la création",
            error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err,
        });
        return;
    }
});
exports.createMouvementStock = createMouvementStock;
// PUT "/:id"
const updateMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { pointVente, depotCentral, produit, type, quantite, montant, statut, region, user, } = req.body;
        const hasPV = !!pointVente;
        const hasRG = !!region;
        const hasDC = depotCentral === true;
        if (!hasPV && !hasRG && !hasDC) {
            res
                .status(400)
                .json({
                message: "Associer un point de vente, une région ou le dépôt central.",
            });
            return;
        }
        if (!user) {
            res.status(400).json({ message: "L'utilisateur est requis" });
            return;
        }
        const updateData = {
            produit,
            type,
            quantite,
            montant,
            statut,
            user: toId(user),
            depotCentral: !!depotCentral,
        };
        if (pointVente)
            updateData.pointVente = toId(pointVente);
        if (region)
            updateData.region = toId(region);
        const updated = yield populateAll(model_1.MouvementStock.findByIdAndUpdate(id, updateData, { new: true }));
        if (!updated) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        res.json(updated);
        return;
    }
    catch (err) {
        res
            .status(400)
            .json({
            message: "Erreur lors de la mise à jour",
            error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err,
        });
        return;
    }
});
exports.updateMouvementStock = updateMouvementStock;
// DELETE "/:id"
const deleteMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield model_1.MouvementStock.findByIdAndDelete(id);
        res.json({ message: "Mouvement supprimé avec succès" });
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.deleteMouvementStock = deleteMouvementStock;
// PUT "/validate/:id"
const validateState = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const mouvement = yield populateAll(model_1.MouvementStock.findByIdAndUpdate(id, { statut: true }, { new: true }));
        if (!mouvement) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        res.json({ message: "Statut du mouvement mis à jour", mouvement });
        return;
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Erreur lors de la validation", error: err });
        return;
    }
});
exports.validateState = validateState;
/* --------------------------- AGRÉGATIONS (OK) ----------------------------- */
// GET "/byUser/aggregate/:userId"
const getMouvementsStockAggregatedByUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { userId } = req.params;
        const page = parseIntSafe(req.query.page, 1);
        const limit = parseIntSafe(req.query.limit, 10);
        const skip = (page - 1) * limit;
        if (!userId) {
            res.status(400).json({ message: "ID utilisateur requis" });
            return;
        }
        yield assertCanAccessUser(req, userId);
        const aggregationPipeline = [
            { $match: { user: new mongoose_1.default.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: "$produit",
                    totalQuantite: { $sum: "$quantite" },
                    totalMontant: { $sum: "$montant" },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    produit: "$_id",
                    totalQuantite: 1,
                    totalMontant: 1,
                    count: 1,
                },
            },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }],
                },
            },
        ];
        const result = yield model_1.MouvementStock.aggregate(aggregationPipeline);
        const data = ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.data) || [];
        const metadata = ((_b = result[0]) === null || _b === void 0 ? void 0 : _b.metadata) || [];
        const total = metadata.length > 0 ? metadata[0].total : 0;
        if (!data.length) {
            res
                .status(404)
                .json({ message: "Aucun mouvement trouvé pour cet utilisateur" });
            return;
        }
        const populatedData = yield Promise.all(data.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            const populatedProduit = yield model_1.Produit.findById(item.produit).populate({
                path: "categorie",
                model: "Categorie",
            });
            return Object.assign(Object.assign({}, item), { produit: populatedProduit });
        })));
        const sortedData = populatedData.sort((a, b) => {
            var _a, _b;
            const nomA = ((_a = a.produit) === null || _a === void 0 ? void 0 : _a.nom) || "";
            const nomB = ((_b = b.produit) === null || _b === void 0 ? void 0 : _b.nom) || "";
            return nomA.localeCompare(nomB);
        });
        res.json({
            total,
            page,
            pages: Math.max(1, Math.ceil(total / limit)),
            limit,
            mouvements: sortedData,
        });
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.getMouvementsStockAggregatedByUserId = getMouvementsStockAggregatedByUserId;
// GET "/by-point-vente/aggregate/:pointVenteId"
const getMouvementsStockAggregatedByPointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { pointVenteId } = req.params;
        const page = parseIntSafe(req.query.page, 1);
        const limit = parseIntSafe(req.query.limit, 10);
        const skip = (page - 1) * limit;
        if (!pointVenteId) {
            res.status(400).json({ message: "ID point de vente requis" });
            return;
        }
        yield assertCanAccessPointVente(req, pointVenteId);
        const aggregationPipeline = [
            { $match: { pointVente: new mongoose_1.default.Types.ObjectId(pointVenteId) } },
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
                $group: {
                    _id: { produitId: "$produit", type: "$type" },
                    totalQuantite: { $sum: "$quantite" },
                    totalMontant: { $sum: "$montant" },
                    count: { $sum: 1 },
                    produitData: { $first: "$produitInfo" },
                    categorieData: { $first: "$categorieInfo" },
                },
            },
            {
                $project: {
                    _id: 0,
                    produit: {
                        _id: "$produitData._id",
                        nom: "$produitData.nom",
                        code: "$produitData.code",
                        categorie: "$categorieData",
                    },
                    type: "$_id.type",
                    totalQuantite: 1,
                    totalMontant: 1,
                    count: 1,
                },
            },
            { $sort: { "produit.nom": 1 } },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }],
                },
            },
        ];
        const result = yield model_1.MouvementStock.aggregate(aggregationPipeline);
        const data = ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.data) || [];
        const metadata = ((_b = result[0]) === null || _b === void 0 ? void 0 : _b.metadata) || [];
        const total = metadata.length > 0 ? metadata[0].total : 0;
        if (!data.length) {
            res.status(404).json({ message: "Aucun mouvement trouvé" });
            return;
        }
        res.json({
            total,
            page,
            pages: Math.max(1, Math.ceil(total / limit)),
            limit,
            mouvements: data,
        });
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.getMouvementsStockAggregatedByPointVente = getMouvementsStockAggregatedByPointVente;
/* ------------------------------ Livraison --------------------------------- */
// POST Livraison (utilisé par une autre route si besoin)
const livrerProduitCommande = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { commandeId, produit, quantite, montant, user, pointVente, region, depotCentral, } = req.body;
        if (!commandeId || !produit || !quantite || !montant || !user) {
            res.status(400).json({
                message: "commandeId, produit, quantite, montant et user sont requis.",
            });
            return;
        }
        const hasPointVente = !!pointVente;
        const hasRegion = !!region;
        const hasDepotCentral = depotCentral === true;
        if (!hasPointVente && !hasRegion && !hasDepotCentral) {
            res.status(400).json({
                message: "Le mouvement doit être associé à un point de vente, une région ou un dépôt central.",
            });
            return;
        }
        const commande = yield model_1.Commande.findById(commandeId);
        if (!commande) {
            res.status(404).json({ message: "Commande non trouvée." });
            return;
        }
        const produitCommande = yield model_1.CommandeProduit.findOne({
            commande: commandeId,
            produit,
            statut: "attente",
        });
        if (!produitCommande) {
            res.status(400).json({
                message: "Ce produit n'existe pas dans la commande ou a déjà été livré/annulé.",
            });
            return;
        }
        if (quantite < produitCommande.quantite) {
            res.status(400).json({
                message: "Quantité livrée inférieure à la quantité commandée.",
            });
            return;
        }
        const mouvementData = {
            produit: new mongoose_1.default.Types.ObjectId(produit),
            quantite,
            montant,
            type: "Livraison",
            statut: true,
            user: new mongoose_1.default.Types.ObjectId(user),
            commandeId: new mongoose_1.default.Types.ObjectId(commandeId),
            depotCentral: !!depotCentral,
        };
        if (pointVente)
            mouvementData.pointVente = new mongoose_1.default.Types.ObjectId(pointVente);
        if (region)
            mouvementData.region = new mongoose_1.default.Types.ObjectId(region);
        const mouvement = new model_1.MouvementStock(mouvementData);
        yield mouvement.save();
        // Mise à jour du produit livré
        produitCommande.statut = "livré";
        produitCommande.mouvementStockId = mouvement._id;
        yield produitCommande.save();
        // Vérification globale de la commande
        const produitsCommande = yield model_1.CommandeProduit.find({
            commande: commandeId,
        });
        const tousLivres = produitsCommande.every((p) => p.statut === "livré");
        if (tousLivres) {
            commande.statut = "livrée";
            yield commande.save();
        }
        const populatedMouvement = yield model_1.MouvementStock.findById(mouvement._id)
            .populate("produit")
            .populate("commandeId")
            .populate("user")
            .populate("region")
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        });
        res.status(201).json({
            message: "Produit livré avec succès.",
            livraison: populatedMouvement,
        });
        return;
    }
    catch (err) {
        res.status(400).json({
            message: "Erreur lors de la livraison du produit",
            error: err.message,
        });
        return;
    }
});
exports.livrerProduitCommande = livrerProduitCommande;
