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
exports.validateMouvementStock = exports.deleteMouvementStock = exports.updateMouvementStock = exports.createMouvementStock = exports.getMouvementById = exports.listMouvementsStock = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../Models/model"); // adapte le chemin si besoin
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale"); //
const parseDateRange = (q) => {
    var _a, _b, _c, _d;
    // priorité aux paramètres explicites dateFrom/dateTo
    const df = q.dateFrom ? new Date(String(q.dateFrom)) : null;
    const dt = q.dateTo ? new Date(String(q.dateTo)) : null;
    if (df && !isNaN(df.getTime()) && dt && !isNaN(dt.getTime())) {
        return { $gte: df, $lte: dt };
    }
    // sinon on accepte period (+ month + year)
    const period = (_a = q.period) !== null && _a !== void 0 ? _a : "tout";
    const now = new Date();
    if (period === "jour") {
        return { $gte: (0, date_fns_1.startOfDay)(now), $lte: (0, date_fns_1.endOfDay)(now) };
    }
    if (period === "semaine") {
        // semaine courante (lundi-dimanche)
        const so = (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1, locale: locale_1.fr });
        const eo = (0, date_fns_1.endOfWeek)(now, { weekStartsOn: 1, locale: locale_1.fr });
        return { $gte: so, $lte: eo };
    }
    if (period === "mois") {
        const y = Number((_b = q.year) !== null && _b !== void 0 ? _b : now.getFullYear());
        const m0 = Math.max(0, Math.min(11, Number((_c = q.month) !== null && _c !== void 0 ? _c : now.getMonth()))); // 0..11
        return {
            $gte: (0, date_fns_1.startOfMonth)(new Date(y, m0, 1)),
            $lte: (0, date_fns_1.endOfMonth)(new Date(y, m0, 1)),
        };
    }
    if (period === "annee") {
        const y = Number((_d = q.year) !== null && _d !== void 0 ? _d : now.getFullYear());
        return {
            $gte: (0, date_fns_1.startOfYear)(new Date(y, 0, 1)),
            $lte: (0, date_fns_1.endOfYear)(new Date(y, 0, 1)),
        };
    }
    return null; // 'tout' → pas de filtre temps
};
const buildFilter = (query) => {
    const f = {};
    if (query.type && query.type !== "Tout")
        f.type = String(query.type);
    if (query.pointVente && mongoose_1.default.Types.ObjectId.isValid(query.pointVente)) {
        f.pointVente = new mongoose_1.default.Types.ObjectId(query.pointVente);
    }
    if (query.region && mongoose_1.default.Types.ObjectId.isValid(query.region)) {
        f.region = new mongoose_1.default.Types.ObjectId(query.region);
    }
    // 🔥 filtre temps (createdAt)
    const createdAtRange = parseDateRange(query);
    if (createdAtRange)
        f.createdAt = createdAtRange;
    // Ajoute d’autres filtres si besoin (produit, user, statut…)
    return f;
};
/* ============================== Helpers ============================== */
const toInt = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
};
const like = (q) => q && q.trim()
    ? {
        $or: [{ type: { $regex: q, $options: "i" } }],
    }
    : {};
// const buildFilter = (query: any) => {
//   const f: any = {};
//   if (query.type && query.type !== 'Tout') f.type = String(query.type);
//   if (query.pointVente && mongoose.Types.ObjectId.isValid(query.pointVente)) {
//     f.pointVente = new mongoose.Types.ObjectId(query.pointVente);
//   }
//   if (query.region && mongoose.Types.ObjectId.isValid(query.region)) {
//     f.region = new mongoose.Types.ObjectId(query.region);
//   }
//   // Ajoute ici au besoin : produit, user, statut, dateFrom/dateTo, etc.
//   return f;
// };
// Champs triables (champs DIRECTS du modèle)
const ALLOWED_SORTS = new Set([
    "createdAt",
    "updatedAt",
    "type",
    "quantite",
    "montant",
    "statut",
]);
/**
 * Pagination tolérante :
 * - si first/offset est fourni => offset-based
 * - sinon page 0-based -> skip = page*limit
 */
const parsePaging = (req) => {
    var _a;
    const limit = Math.max(1, toInt(req.query.limit, 10));
    if (req.query.first !== undefined || req.query.offset !== undefined) {
        const first = Math.max(0, toInt((_a = req.query.first) !== null && _a !== void 0 ? _a : req.query.offset, 0));
        return { limit, skip: first, first };
    }
    const page = Math.max(0, toInt(req.query.page, 0));
    const skip = page * limit;
    return { limit, skip, first: skip };
};
/* ============================== Controllers ============================== */
/**
 * GET /mouvements
 * Query:
 *  - first/limit (offset-based) OU page/limit (0-based)
 *  - sortBy/order
 *  - q + filtres (type, region, pointVente, ...)
 *  - includeTotal, includeRefs
 */
const listMouvementsStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { limit, skip, first } = parsePaging(req);
        const rawSortBy = req.query.sortBy || "createdAt";
        const order = req.query.order === "asc" ? "asc" : "desc";
        const includeTotal = String(req.query.includeTotal || "true") === "true";
        const includeRefs = String(req.query.includeRefs || "true") === "true";
        const q = req.query.q || "";
        // Normalisation du tri : pas de champs "dotés" (ex. produit.nom)
        const sortBy = ALLOWED_SORTS.has(rawSortBy) ? rawSortBy : "createdAt";
        const sort = {
            [sortBy]: order === "asc" ? 1 : -1,
            _id: order === "asc" ? 1 : -1, // tri secondaire stable
        };
        const filter = Object.assign(Object.assign({}, buildFilter(req.query)), like(q));
        let cursor = model_1.MouvementStock.find(filter).sort(sort).skip(skip).limit(limit);
        if (includeRefs) {
            cursor = cursor
                .populate({
                path: "produit",
                populate: { path: "categorie", model: "Categorie" },
            })
                .populate({
                path: "pointVente",
                populate: { path: "region", model: "Region" },
            })
                .populate("region")
                .populate({ path: "user", select: "-password" });
        }
        const [items, total] = yield Promise.all([
            cursor.exec(),
            includeTotal
                ? model_1.MouvementStock.countDocuments(filter)
                : Promise.resolve(undefined),
        ]);
        res.json({
            data: items,
            meta: {
                first, // offset courant
                limit,
                total: total !== null && total !== void 0 ? total : items.length,
                sortBy,
                order,
                q,
            },
        });
    }
    catch (err) {
        res.status(500).json({
            message: "Erreur interne lors de la récupération des mouvements.",
            error: err.message,
        });
    }
});
exports.listMouvementsStock = listMouvementsStock;
/**
 * GET /mouvements/:id
 */
const getMouvementById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const doc = yield model_1.MouvementStock.findById(id)
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        })
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        })
            .populate("region")
            .populate({ path: "user", select: "-password" });
        if (!doc) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        res.json(doc);
    }
    catch (err) {
        res.status(500).json({
            message: "Erreur interne lors de la récupération du mouvement.",
            error: err.message,
        });
    }
});
exports.getMouvementById = getMouvementById;
/**
 * POST /mouvements
 * -> utilise .save() => déclenche bien pre('save') / post('save')
 */
const createMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { produit, quantite, montant, type, user, pointVente, region, depotCentral, statut, } = req.body;
        if (!produit || !quantite || !type || !user) {
            res
                .status(400)
                .json({
                message: "Champs requis manquants (produit, quantite, type, user).",
            });
            return;
        }
        const mouvement = new model_1.MouvementStock(Object.assign({ produit,
            quantite, montant: montant !== null && montant !== void 0 ? montant : 0, type,
            user, pointVente: pointVente || undefined, region: region || undefined, depotCentral: !!depotCentral }, (typeof statut === "boolean" ? { statut } : {})));
        // ⇩⇩⇩ TRIGGER pre/post('save')
        yield mouvement.save();
        const populated = yield model_1.MouvementStock.findById(mouvement._id)
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        })
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        })
            .populate("region")
            .populate({ path: "user", select: "-password" });
        res.status(201).json(populated);
    }
    catch (err) {
        res.status(500).json({
            message: "Erreur lors de la création du mouvement.",
            error: err.message,
        });
    }
});
exports.createMouvementStock = createMouvementStock;
/**
 * PUT /mouvements/:id
 * -> **NE PAS** utiliser findByIdAndUpdate si l’on veut déclencher les hooks save.
 *    On charge le doc, on set(), puis doc.save()
 */
const updateMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const doc = yield model_1.MouvementStock.findById(id);
        if (!doc) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        // Mettre à jour les champs autorisés
        const payload = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        doc.set(payload);
        // ⇩⇩⇩ TRIGGER pre/post('save')
        yield doc.save();
        // Re-populer pour la réponse
        yield doc.populate([
            { path: "produit", populate: { path: "categorie", model: "Categorie" } },
            { path: "pointVente", populate: { path: "region", model: "Region" } },
            { path: "region" },
            { path: "user", select: "-password" },
        ]);
        res.json(doc);
    }
    catch (err) {
        res.status(500).json({
            message: "Erreur lors de la mise à jour du mouvement.",
            error: err.message,
        });
    }
});
exports.updateMouvementStock = updateMouvementStock;
/**
 * DELETE /mouvements/:id
 * (tes hooks sont sur save, donc pas d’impact ici)
 */
const deleteMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const deleted = yield model_1.MouvementStock.findByIdAndDelete(id);
        if (!deleted) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        res.json({ message: "Mouvement supprimé avec succès" });
    }
    catch (err) {
        res.status(500).json({
            message: "Erreur lors de la suppression du mouvement.",
            error: err.message,
        });
    }
});
exports.deleteMouvementStock = deleteMouvementStock;
/**
 * PATCH /mouvements/:id/validate
 * -> idem : on charge, on modifie, on save() pour déclencher les hooks
 */
const validateMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const doc = yield model_1.MouvementStock.findById(id);
        if (!doc) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        doc.statut = true;
        // ⇩⇩⇩ TRIGGER pre/post('save')
        yield doc.save();
        yield doc.populate([
            { path: "produit", populate: { path: "categorie", model: "Categorie" } },
            { path: "pointVente", populate: { path: "region", model: "Region" } },
            { path: "region" },
            { path: "user", select: "-password" },
        ]);
        res.json({ success: true, mouvement: doc });
    }
    catch (err) {
        res.status(500).json({
            message: "Erreur lors de la validation du mouvement.",
            error: err.message,
        });
    }
});
exports.validateMouvementStock = validateMouvementStock;
