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
exports.checkStockHandler = exports.checkStock = exports.deleteStock = exports.updateStock = exports.createStock = exports.getStockById = exports.getAllStocks = void 0;
const mongoose_1 = require("mongoose");
const model_1 = require("../Models/model");
/* ------------------------------ Utils parsing ------------------------------ */
const toObjectId = (v) => typeof v === "string" && mongoose_1.Types.ObjectId.isValid(v) ? new mongoose_1.Types.ObjectId(v) : undefined;
const parseBool = (v, def = false) => {
    if (v === true || v === false)
        return v;
    if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (["true", "1", "yes", "y"].includes(s))
            return true;
        if (["false", "0", "no", "n"].includes(s))
            return false;
    }
    return def;
};
const parseIntSafe = (v, def) => {
    const n = Number.parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : def;
};
const sanitizeSort = (field) => {
    // autoriser seulement ces champs de tri
    const allow = new Set([
        "createdAt",
        "updatedAt",
        "quantite",
        "montant",
        "produit.nom",
        "pointVente.nom",
        "region.nom",
    ]);
    return allow.has(field || "") ? field : "createdAt";
};
const sortOrderToInt = (order) => (order === "asc" ? 1 : -1);
/* ------------------------------- GET /stocks ------------------------------- */
/**
 * Query params pris en charge :
 * - page (default 1), limit (default 10)
 * - sortBy (default 'createdAt'), order ('asc'|'desc', default 'desc')
 * - q (recherche sur produit.nom, categorie.nom, pointVente.nom, region.nom)
 * - produit, pointVente, region (ObjectId)
 * - depotCentral ('true'/'false')
 * - includeTotal ('true' par défaut) : renvoie meta.total/pages/...
 * - includeRefs ('true' par défaut) : renvoie les références peuplées via $lookup
 */
const getAllStocks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { page: pageQ, limit: limitQ, sortBy: sortByQ, order: orderQ, q: qQ, produit: produitQ, pointVente: pointVenteQ, region: regionQ, depotCentral: depotCentralQ, includeTotal: includeTotalQ, includeRefs: includeRefsQ, } = req.query;
        const page = parseIntSafe(pageQ, 1);
        const limit = parseIntSafe(limitQ, 10);
        const skip = (page - 1) * limit;
        const sortBy = sanitizeSort(sortByQ);
        const order = sortOrderToInt(orderQ === "asc" ? "asc" : "desc");
        const includeTotal = parseBool(includeTotalQ, true);
        const includeRefs = parseBool(includeRefsQ, true);
        // Filtres de base (IDs + depotCentral)
        const match = {};
        const produitId = toObjectId(produitQ);
        const pvId = toObjectId(pointVenteQ);
        const regionId = toObjectId(regionQ);
        const depotCentral = typeof depotCentralQ !== "undefined" ? parseBool(depotCentralQ) : undefined;
        if (produitId)
            match.produit = produitId;
        if (pvId)
            match.pointVente = pvId;
        if (regionId)
            match.region = regionId;
        if (typeof depotCentral === "boolean")
            match.depotCentral = depotCentral;
        // Recherche texte (via $lookup), si q fourni
        const q = typeof qQ === "string" && qQ.trim().length ? qQ.trim() : undefined;
        const regex = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : undefined;
        // Pipeline d'agrégation
        const pipeline = [
            { $match: match },
            // lookup produit
            {
                $lookup: {
                    from: "produits",
                    localField: "produit",
                    foreignField: "_id",
                    as: "produitDoc",
                },
            },
            { $unwind: { path: "$produitDoc", preserveNullAndEmptyArrays: true } },
            // lookup categorie du produit
            {
                $lookup: {
                    from: "categories",
                    localField: "produitDoc.categorie",
                    foreignField: "_id",
                    as: "categorieDoc",
                },
            },
            { $unwind: { path: "$categorieDoc", preserveNullAndEmptyArrays: true } },
            // lookup point de vente
            {
                $lookup: {
                    from: "pointventes",
                    localField: "pointVente",
                    foreignField: "_id",
                    as: "pointVenteDoc",
                },
            },
            { $unwind: { path: "$pointVenteDoc", preserveNullAndEmptyArrays: true } },
            // lookup region directe
            {
                $lookup: {
                    from: "regions",
                    localField: "region",
                    foreignField: "_id",
                    as: "regionDoc",
                },
            },
            { $unwind: { path: "$regionDoc", preserveNullAndEmptyArrays: true } },
            // lookup region du pointVente (optionnel pour enrichir)
            {
                $lookup: {
                    from: "regions",
                    localField: "pointVenteDoc.region",
                    foreignField: "_id",
                    as: "pvRegionDoc",
                },
            },
            { $unwind: { path: "$pvRegionDoc", preserveNullAndEmptyArrays: true } },
        ];
        // Si recherche plein-texte sur référentiels
        if (regex) {
            pipeline.push({
                $match: {
                    $or: [
                        { "produitDoc.nom": regex },
                        { "categorieDoc.nom": regex },
                        { "pointVenteDoc.nom": regex },
                        { "regionDoc.nom": regex },
                        { "pvRegionDoc.nom": regex },
                    ],
                },
            });
        }
        // Projection : si includeRefs=false, renvoyer le document brut
        if (includeRefs) {
            pipeline.push({
                $project: {
                    _id: 1,
                    quantite: 1,
                    montant: 1,
                    depotCentral: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    produit: {
                        _id: "$produitDoc._id",
                        nom: "$produitDoc.nom",
                        prix: "$produitDoc.prix",
                        tva: "$produitDoc.tva",
                        prixVente: "$produitDoc.prixVente",
                        netTopay: "$produitDoc.netTopay",
                        categorie: {
                            _id: "$categorieDoc._id",
                            nom: "$categorieDoc.nom",
                            image: "$categorieDoc.image",
                        },
                    },
                    pointVente: {
                        _id: "$pointVenteDoc._id",
                        nom: "$pointVenteDoc.nom",
                        adresse: "$pointVenteDoc.adresse",
                        region: {
                            _id: "$pvRegionDoc._id",
                            nom: "$pvRegionDoc.nom",
                            ville: "$pvRegionDoc.ville",
                        },
                    },
                    region: {
                        _id: "$regionDoc._id",
                        nom: "$regionDoc.nom",
                        ville: "$regionDoc.ville",
                    },
                },
            });
        }
        else {
            // Données brutes (sans refs)
            pipeline.push({
                $project: {
                    _id: 1,
                    quantite: 1,
                    montant: 1,
                    produit: 1,
                    pointVente: 1,
                    region: 1,
                    depotCentral: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            });
        }
        // Tri
        pipeline.push({ $sort: { [sortBy]: order, _id: -1 } });
        // Facet pagination + total
        pipeline.push({
            $facet: Object.assign({ data: [{ $skip: skip }, { $limit: limit }] }, (includeTotal ? { metadata: [{ $count: "total" }] } : {})),
        });
        const result = yield model_1.Stock.aggregate(pipeline);
        const doc = (result === null || result === void 0 ? void 0 : result[0]) || { data: [], metadata: [] };
        const data = doc.data || [];
        let total = 0;
        if (includeTotal) {
            total = ((_b = (_a = doc.metadata) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.total) || 0;
        }
        res.json({
            data,
            meta: {
                total,
                page,
                pages: includeTotal ? Math.ceil(total / limit) : undefined,
                limit,
                hasNext: includeTotal ? page * limit < total : undefined,
                hasPrev: includeTotal ? page > 1 : undefined,
                sortBy,
                order: order === 1 ? "asc" : "desc",
            },
        });
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.getAllStocks = getAllStocks;
/* ------------------------------- GET /stocks/:id --------------------------- */
const getStockById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
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
/* -------------------------------- POST /stocks ----------------------------- */
const createStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { produit, quantite, montant, pointVente, region, depotCentral } = req.body;
        const produitId = toObjectId(produit);
        const pvId = toObjectId(pointVente);
        const regionId = toObjectId(region);
        const depot = !!depotCentral;
        if (!produitId) {
            res.status(400).json({ message: "Produit invalide" });
            return;
        }
        // Au moins une localisation : PV, Région, ou Dépôt central (true)
        if (!pvId && !regionId && depot !== true) {
            res.status(400).json({
                message: "Un stock doit être associé à un point de vente, une région, ou être marqué comme 'dépôt central'.",
            });
            return;
        }
        const stock = new model_1.Stock({
            produit: produitId,
            quantite,
            montant,
            pointVente: pvId,
            region: regionId,
            depotCentral: depot,
        });
        yield stock.save();
        res.status(201).json(stock);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createStock = createStock;
/* ------------------------------- PUT /stocks/:id --------------------------- */
const updateStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        const { produit, quantite, montant, pointVente, region, depotCentral } = req.body;
        const produitId = toObjectId(produit);
        const pvId = toObjectId(pointVente);
        const regionId = toObjectId(region);
        const depot = !!depotCentral;
        if (!produitId) {
            res.status(400).json({ message: "Produit invalide" });
            return;
        }
        if (!pvId && !regionId && depot !== true) {
            res.status(400).json({
                message: "Un stock doit être associé à un point de vente, une région, ou être marqué comme 'dépôt central'.",
            });
            return;
        }
        const updated = yield model_1.Stock.findByIdAndUpdate(id, {
            produit: produitId,
            quantite,
            montant,
            pointVente: pvId,
            region: regionId,
            depotCentral: depot,
        }, { new: true, runValidators: true });
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
/* ------------------------------ DELETE /stocks/:id ------------------------- */
const deleteStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "ID invalide" });
            return;
        }
        yield model_1.Stock.findByIdAndDelete(id);
        res.json({ message: "Stock supprimé avec succès" });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.deleteStock = deleteStock;
/* -------------------------- Vérification de stock -------------------------- */
/**
 * checkStock — logique existante conservée (PV / dépôt central).
 * Si tu souhaites supporter la "région" ici, on peut ajouter un paramètre `regionId`.
 */
const checkStock = (type, produitId, pointVenteId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.Types.ObjectId.isValid(produitId)) {
        return 0;
    }
    if (pointVenteId && !mongoose_1.Types.ObjectId.isValid(pointVenteId)) {
        return 0;
    }
    const query = { produit: new mongoose_1.Types.ObjectId(produitId) };
    if (type === "Livraison") {
        query.depotCentral = true;
    }
    else if (["Vente", "Commande", "Sortie"].includes(type)) {
        if (!pointVenteId)
            return 0;
        query.pointVente = new mongoose_1.Types.ObjectId(pointVenteId);
    }
    else {
        return 0;
    }
    const stock = yield model_1.Stock.findOne(query).lean();
    return (stock === null || stock === void 0 ? void 0 : stock.quantite) || 0;
});
exports.checkStock = checkStock;
const checkStockHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { type, produitId, quantite, pointVenteId } = req.body;
    if (!type || !produitId || quantite == null) {
        res.status(400).json({ success: false, message: "Paramètres manquants" });
        return;
    }
    try {
        const quantiteDisponible = yield (0, exports.checkStock)(type, produitId, pointVenteId);
        res.json({
            success: true,
            quantiteDisponible,
            suffisant: quantiteDisponible >= Number(quantite),
        });
        return;
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur", error });
        return;
    }
});
exports.checkStockHandler = checkStockHandler;
