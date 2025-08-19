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
exports.deletePointVente = exports.updatePointVente = exports.createPointVente = exports.getPointVenteById = exports.getPointVentesByRegion = exports.searchPointVentes = exports.getAllPointVentes = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../Models/model");
/** -------------------- Utils pagination/tri/filtre -------------------- */
const parsePagination = (req) => {
    var _a, _b;
    const page = Math.max(1, parseInt(String((_a = req.query.page) !== null && _a !== void 0 ? _a : "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String((_b = req.query.limit) !== null && _b !== void 0 ? _b : "10"), 10) || 10));
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || "createdAt"; // "nom" | "createdAt" | ...
    const order = (req.query.order || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sort = { [sortBy]: order };
    return { page, limit, skip, sort };
};
const buildSearchFilter = (req) => {
    const q = req.query.q || "";
    const region = req.query.region || "";
    const filter = {};
    const $and = [];
    if (q) {
        $and.push({
            $or: [
                { nom: { $regex: q, $options: "i" } },
                { adresse: { $regex: q, $options: "i" } },
            ],
        });
    }
    if (region && mongoose_1.default.Types.ObjectId.isValid(region)) {
        $and.push({ region: new mongoose_1.default.Types.ObjectId(region) });
    }
    if ($and.length)
        filter.$and = $and;
    return filter;
};
const paginationMeta = (page, limit, total) => {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
        page,
        limit,
        total,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
    };
};
/** -------------------- LISTE: pagination/tri/filtres -------------------- */
const getAllPointVentes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { page, limit, skip, sort } = parsePagination(req);
        const filter = buildSearchFilter(req);
        const includeTotal = String((_a = req.query.includeTotal) !== null && _a !== void 0 ? _a : "true") !== "false";
        const includeStock = String((_b = req.query.includeStock) !== null && _b !== void 0 ? _b : "false") === "true";
        const query = model_1.PointVente.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate("region");
        if (includeStock)
            query.populate("stock.produit");
        const [data, total] = yield Promise.all([
            query.exec(),
            includeTotal ? model_1.PointVente.countDocuments(filter) : Promise.resolve(-1),
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
exports.getAllPointVentes = getAllPointVentes;
/** -------------------- RECHERCHE (mêmes query params) -------------------- */
const searchPointVentes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { page, limit, skip, sort } = parsePagination(req);
        const filter = buildSearchFilter(req);
        const includeTotal = String((_a = req.query.includeTotal) !== null && _a !== void 0 ? _a : "true") !== "false";
        const includeStock = String((_b = req.query.includeStock) !== null && _b !== void 0 ? _b : "false") === "true";
        const query = model_1.PointVente.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate("region");
        if (includeStock)
            query.populate("stock.produit");
        const [data, total] = yield Promise.all([
            query.exec(),
            includeTotal ? model_1.PointVente.countDocuments(filter) : Promise.resolve(-1),
        ]);
        res.json({
            data,
            meta: includeTotal ? paginationMeta(page, limit, total) : undefined,
        });
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Erreur lors de la recherche", error: err });
    }
});
exports.searchPointVentes = searchPointVentes;
/** -------------------- LISTE PAR RÉGION (compat) -------------------- */
const getPointVentesByRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { regionId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(regionId)) {
            res.status(400).json({ message: "ID de région invalide" });
            return;
        }
        // On redirige vers la logique de liste avec filtre region
        // Supporte pagination/tri via querystring
        req.query.region = regionId;
        return (0, exports.getAllPointVentes)(req, res);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getPointVentesByRegion = getPointVentesByRegion;
/** -------------------- DÉTAIL -------------------- */
const getPointVenteById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const includeStock = String((_a = req.query.includeStock) !== null && _a !== void 0 ? _a : "true") === "true";
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        let q = model_1.PointVente.findById(id).populate("region");
        if (includeStock)
            q = q.populate("stock.produit");
        const pv = yield q.exec();
        if (!pv) {
            res.status(404).json({ message: "Point de vente non trouvé" });
            return;
        }
        const obj = pv.toObject();
        res.json(obj);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getPointVenteById = getPointVenteById;
/** -------------------- CRÉATION -------------------- */
const createPointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { nom, adresse, region } = req.body;
        const pointVente = new model_1.PointVente({ nom, adresse, region });
        yield pointVente.save();
        yield pointVente.populate("region");
        res.status(201).json(pointVente);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createPointVente = createPointVente;
/** -------------------- MISE À JOUR -------------------- */
const updatePointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const updateData = req.body;
        const updatedPointVente = yield model_1.PointVente.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        })
            .populate("region")
            .populate("stock.produit");
        if (!updatedPointVente) {
            res.status(404).json({ message: "Point de vente non trouvé" });
            return;
        }
        res.json(updatedPointVente);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.updatePointVente = updatePointVente;
/** -------------------- SUPPRESSION (cascade + fallback sans transaction) -------------------- */
function cascadeDeletePointVente(pointVenteId, session) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1) Vérifier existence
        const exists = yield (session
            ? model_1.PointVente.findById(pointVenteId).session(session)
            : model_1.PointVente.findById(pointVenteId));
        if (!exists)
            return "NOT_FOUND";
        // 2) Supprimer dépendances
        // - Produits rattachés à ce PV (si ton schéma Produit a un champ pointVente)
        yield (model_1.Produit === null || model_1.Produit === void 0 ? void 0 : model_1.Produit.deleteMany({ pointVente: pointVenteId }, { session }).catch(() => Promise.resolve()));
        // - Ventes / Livraisons / Mouvements liés à ce PV (ajuste les noms de champs selon tes schémas)
        const pvMatch = [
            { pointVente: pointVenteId },
            { point_vente: pointVenteId },
            { pointDeVente: pointVenteId },
            { pos: pointVenteId },
        ];
        yield (model_1.MouvementStock === null || model_1.MouvementStock === void 0 ? void 0 : model_1.MouvementStock.deleteMany({ $or: pvMatch }, { session }).catch(() => Promise.resolve()));
        // 3) Supprimer le point de vente
        if (session) {
            yield model_1.PointVente.findByIdAndDelete(pointVenteId, { session });
        }
        else {
            yield model_1.PointVente.findByIdAndDelete(pointVenteId);
        }
        return "DELETED";
    });
}
const deletePointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            const r = yield cascadeDeletePointVente(id, session);
            if (r === "NOT_FOUND")
                throw { status: 404, message: "Point de vente non trouvé" };
        }));
        res.json({
            message: "Point de vente supprimé avec succès (cascade en transaction)",
        });
    }
    catch (err) {
        // Fallback si standalone (code 20)
        const isNoTxn = (err === null || err === void 0 ? void 0 : err.code) === 20 ||
            /Transaction numbers are only allowed/.test(String(err === null || err === void 0 ? void 0 : err.message));
        if (isNoTxn) {
            try {
                const r = yield cascadeDeletePointVente(id); // sans session
                if (r === "NOT_FOUND") {
                    res.status(404).json({ message: "Point de vente non trouvé" });
                    return;
                }
                res.json({
                    message: "Point de vente supprimé avec succès (cascade sans transaction)",
                });
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
exports.deletePointVente = deletePointVente;
