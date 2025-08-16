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
exports.deleteProduit = exports.updateProduit = exports.createProduit = exports.getProduitById = exports.searchProduit = exports.getAllProduits = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../Models/model");
// 👉 Si tes modèles sont dans d'autres fichiers, ajuste ces imports :
/** Utilitaires */
const parsePagination = (req) => {
    var _a, _b;
    const page = Math.max(1, parseInt(String((_a = req.query.page) !== null && _a !== void 0 ? _a : "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String((_b = req.query.limit) !== null && _b !== void 0 ? _b : "10"), 10) || 10));
    const skip = (page - 1) * limit;
    // Tri simple: ?sortBy=createdAt&order=desc  (order: asc|desc)
    const sortBy = req.query.sortBy || "createdAt";
    const order = (req.query.order || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sort = { [sortBy]: order };
    return { page, limit, skip, sort };
};
const buildSearchFilter = (req) => {
    const q = req.query.q || "";
    const categorie = req.query.categorie || "";
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const filter = {};
    if (q) {
        filter.nom = { $regex: q, $options: "i" };
    }
    if (categorie && mongoose_1.default.Types.ObjectId.isValid(categorie)) {
        filter.categorie = new mongoose_1.default.Types.ObjectId(categorie);
    }
    if (minPrice != null || maxPrice != null) {
        filter.prixVente = {};
        if (minPrice != null)
            filter.prixVente.$gte = minPrice;
        if (maxPrice != null)
            filter.prixVente.$lte = maxPrice;
    }
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
// 🔹 Obtenir tous les produits (avec pagination / tri / filtres)
const getAllProduits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { page, limit, skip, sort } = parsePagination(req);
        const filter = buildSearchFilter(req);
        // ?includeTotal=false pour ne pas calculer le total (perf)
        const includeTotal = String((_a = req.query.includeTotal) !== null && _a !== void 0 ? _a : "true") !== "false";
        const query = model_1.Produit.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate("categorie");
        const [produits, total] = yield Promise.all([
            query.exec(),
            includeTotal ? model_1.Produit.countDocuments(filter) : Promise.resolve(-1),
        ]);
        res.json({
            data: produits,
            meta: includeTotal ? paginationMeta(page, limit, total) : undefined,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllProduits = getAllProduits;
// 🔹 Recherche (paginée) – garde aussi cet endpoint si tu l’utilises déjà côté front
const searchProduit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { page, limit, skip, sort } = parsePagination(req);
        const filter = buildSearchFilter(req);
        const includeTotal = String((_a = req.query.includeTotal) !== null && _a !== void 0 ? _a : "true") !== "false";
        const query = model_1.Produit.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate("categorie");
        const [produits, total] = yield Promise.all([
            query.exec(),
            includeTotal ? model_1.Produit.countDocuments(filter) : Promise.resolve(-1),
        ]);
        res.json({
            data: produits,
            meta: includeTotal ? paginationMeta(page, limit, total) : undefined,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur lors de la recherche", error: err });
    }
});
exports.searchProduit = searchProduit;
// 🔹 Obtenir un produit par ID
const getProduitById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const produit = yield model_1.Produit.findById(id).populate("categorie");
        if (!produit) {
            res.status(404).json({ message: "Produit non trouvé" });
            return;
        }
        res.json(produit);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getProduitById = getProduitById;
// 🔹 Créer un produit
const createProduit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { nom, categorie, prix, tva, prixVente, marge, netTopay, unite, seuil, } = req.body;
        const produit = new model_1.Produit({
            nom,
            categorie,
            prix,
            tva,
            prixVente,
            marge,
            netTopay,
            unite,
            seuil,
        });
        yield produit.save();
        yield produit.populate("categorie");
        res.status(201).json(produit);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createProduit = createProduit;
// 🔹 Mettre à jour un produit
const updateProduit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const updateData = req.body;
        const updatedProduit = yield model_1.Produit.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).populate("categorie");
        if (!updatedProduit) {
            res.status(404).json({ message: "Produit non trouvé" });
            return;
        }
        res.json(updatedProduit);
    }
    catch (err) {
        res.status(400).json({
            message: "Erreur lors de la mise à jour du produit",
            error: err instanceof Error ? err.message : err,
        });
    }
});
exports.updateProduit = updateProduit;
// 🔹 Supprimer un produit (CASCADE) dans une transaction
function cascadeDeleteProduit(id, session) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1) Vérifier que le produit existe
        const produit = yield (session
            ? model_1.Produit.findById(id).session(session)
            : model_1.Produit.findById(id));
        if (!produit)
            return "NOT_FOUND";
        // 2) Supprimer les dépendances connues
        //    Ajuste les noms de modèles/champs selon tes schémas
        yield (model_1.CommandeProduit === null || model_1.CommandeProduit === void 0 ? void 0 : model_1.CommandeProduit.deleteMany({ $or: [{ produit: id }, { produitId: id }] }, { session }).catch(() => Promise.resolve()));
        yield (model_1.MouvementStock === null || model_1.MouvementStock === void 0 ? void 0 : model_1.MouvementStock.deleteMany({ produit: id }, { session }).catch(() => Promise.resolve()));
        // 3) Supprimer le produit
        if (session) {
            yield model_1.Produit.findByIdAndDelete(id, { session });
        }
        else {
            yield model_1.Produit.findByIdAndDelete(id);
        }
        return "DELETED";
    });
}
const deleteProduit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { id } = req.params;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: "ID invalide" });
        return;
    }
    const session = yield mongoose_1.default.startSession();
    try {
        // --- 1) Essai avec transaction (si replica set/mongos présent) ---
        yield session.withTransaction(() => __awaiter(void 0, void 0, void 0, function* () {
            const r = yield cascadeDeleteProduit(id, session);
            if (r === "NOT_FOUND")
                throw { status: 404, message: "Produit non trouvé" };
        }));
        res.json({ message: "Produit supprimé avec succès (cascade en transaction)" });
    }
    catch (err) {
        // --- 2) Fallback si transactions non supportées ---
        const isNoTxn = (err === null || err === void 0 ? void 0 : err.code) === 20 ||
            /Transaction numbers are only allowed/.test(String(err === null || err === void 0 ? void 0 : err.message));
        if (isNoTxn) {
            try {
                const r = yield cascadeDeleteProduit(id); // sans session/transaction
                if (r === "NOT_FOUND") {
                    res.status(404).json({ message: "Produit non trouvé" });
                    return;
                }
                res.json({ message: "Produit supprimé avec succès (cascade sans transaction)" });
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
exports.deleteProduit = deleteProduit;
