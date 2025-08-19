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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCommande = exports.updateCommande = exports.createCommande = exports.getCommandeById = exports.getCommandesByRegion = exports.getCommandesByPointVente = exports.getCommandesByUser = exports.getAllCommandes = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../Models/model");
/* --------------------------- Utils pagination/sort -------------------------- */
const getListOptions = (req) => {
    var _a, _b;
    const page = Math.max(parseInt(String((_a = req.query.page) !== null && _a !== void 0 ? _a : "1"), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String((_b = req.query.limit) !== null && _b !== void 0 ? _b : "10"), 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const sortBy = String(req.query.sortBy || "createdAt");
    const order = String(req.query.order || "desc").toLowerCase() === "asc" ? 1 : -1;
    const sort = { [sortBy]: order };
    return { page, limit, skip, sort };
};
const commonPopulate = [
    { path: "user", select: "-password" },
    { path: "region" },
    { path: "pointVente", populate: { path: "region", model: "Region" } },
];
/* ------------------------------ Format commande ---------------------------- */
const formatCommande = (commande) => __awaiter(void 0, void 0, void 0, function* () {
    yield commande.populate({
        path: "produits",
        populate: { path: "produit", model: "Produit" },
    });
    // Montant total = somme(prix * quantité) sur lignes
    let montant = 0;
    // Taux de livraison — on calcule 2 métriques utiles
    let lignesLivrees = 0;
    let quantiteTotale = 0;
    let quantiteLivree = 0;
    commande.produits.forEach((cp) => {
        var _a, _b, _c;
        const prix = (_b = (_a = cp === null || cp === void 0 ? void 0 : cp.produit) === null || _a === void 0 ? void 0 : _a.prix) !== null && _b !== void 0 ? _b : 0;
        const qte = (_c = cp === null || cp === void 0 ? void 0 : cp.quantite) !== null && _c !== void 0 ? _c : 0;
        montant += prix * qte;
        quantiteTotale += qte;
        if (cp.statut === "livré") {
            lignesLivrees += 1;
            quantiteLivree += qte;
        }
    });
    const totalLignes = commande.produits.length || 1;
    const tauxLivraisonLignes = Math.round((lignesLivrees / totalLignes) * 100);
    const tauxLivraisonQuantite = quantiteTotale > 0
        ? Math.round((quantiteLivree / quantiteTotale) * 100)
        : 0;
    return Object.assign(Object.assign({}, commande.toObject()), { montant, lignes: totalLignes, lignesLivrees,
        tauxLivraisonLignes,
        tauxLivraisonQuantite });
});
/* --------------------------------- GET all --------------------------------- */
const getAllCommandes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { skip, limit, sort, page } = getListOptions(req);
        // petits filtres optionnels: q (numero), user, region, pointVente
        const q = String(req.query.q || "").trim();
        const where = {};
        if (q)
            where.numero = { $regex: q, $options: "i" };
        if (req.query.user &&
            mongoose_1.default.Types.ObjectId.isValid(String(req.query.user))) {
            where.user = req.query.user;
        }
        if (req.query.region &&
            mongoose_1.default.Types.ObjectId.isValid(String(req.query.region))) {
            where.region = req.query.region;
        }
        if (req.query.pointVente &&
            mongoose_1.default.Types.ObjectId.isValid(String(req.query.pointVente))) {
            where.pointVente = req.query.pointVente;
        }
        const [total, rows] = yield Promise.all([
            model_1.Commande.countDocuments(where),
            model_1.Commande.find(where)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate(commonPopulate),
        ]);
        const commandes = yield Promise.all(rows.map(formatCommande));
        res.status(200).json({ total, page, limit, commandes });
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la récupération des commandes.",
            error: error.message,
        });
    }
});
exports.getAllCommandes = getAllCommandes;
/* ------------------------------- GET by user ------------------------------- */
const getCommandesByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ message: "userId invalide" });
            return;
        }
        const { skip, limit, sort, page } = getListOptions(req);
        const [total, rows] = yield Promise.all([
            model_1.Commande.countDocuments({ user: userId }),
            model_1.Commande.find({ user: userId })
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate(commonPopulate),
        ]);
        const commandes = yield Promise.all(rows.map(formatCommande));
        res.status(200).json({ total, page, limit, commandes });
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la récupération des commandes utilisateur.",
            error: error.message,
        });
    }
});
exports.getCommandesByUser = getCommandesByUser;
/* --------------------------- GET by point de vente ------------------------- */
const getCommandesByPointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pointVenteId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(pointVenteId)) {
            res.status(400).json({ message: "pointVenteId invalide" });
            return;
        }
        const { skip, limit, sort, page } = getListOptions(req);
        const [total, rows] = yield Promise.all([
            model_1.Commande.countDocuments({ pointVente: pointVenteId }),
            model_1.Commande.find({ pointVente: pointVenteId })
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate(commonPopulate),
        ]);
        const commandes = yield Promise.all(rows.map(formatCommande));
        res.status(200).json({ total, page, limit, commandes });
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la récupération des commandes par point de vente.",
            error: error.message,
        });
    }
});
exports.getCommandesByPointVente = getCommandesByPointVente;
/* -------------------------------- GET by region ---------------------------- */
const getCommandesByRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { regionId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(regionId)) {
            res.status(400).json({ message: "regionId invalide" });
            return;
        }
        const { skip, limit, sort, page } = getListOptions(req);
        // Récupère les PV de la région pour une requête directe (au lieu de filtrer en JS)
        const pvIds = yield model_1.PointVente.find({ region: regionId }).distinct("_id");
        const where = {
            $or: [
                { region: new mongoose_1.default.Types.ObjectId(regionId) },
                { pointVente: { $in: pvIds } },
            ],
        };
        const [total, rows] = yield Promise.all([
            model_1.Commande.countDocuments(where),
            model_1.Commande.find(where)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate(commonPopulate),
        ]);
        const commandes = yield Promise.all(rows.map(formatCommande));
        res.status(200).json({ total, page, limit, commandes });
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la récupération des commandes par région.",
            error: error.message,
        });
    }
});
exports.getCommandesByRegion = getCommandesByRegion;
/* -------------------------------- GET by id -------------------------------- */
const getCommandeById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "id invalide" });
            return;
        }
        const commande = yield model_1.Commande.findById(id).populate(commonPopulate);
        if (!commande) {
            res.status(404).json({ message: "Commande non trouvée." });
            return;
        }
        const formatted = yield formatCommande(commande);
        res.status(200).json(formatted);
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la récupération de la commande.",
            error: error.message,
        });
    }
});
exports.getCommandeById = getCommandeById;
/* ----------------------------------- POST ---------------------------------- */
const createCommande = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user, region, pointVente, depotCentral, produits } = req.body;
        if (!user || !Array.isArray(produits) || produits.length === 0) {
            res
                .status(400)
                .json({ message: "L'utilisateur et les produits sont requis." });
            return;
        }
        const hasPointVente = !!pointVente;
        const hasRegion = !!region;
        const hasDepotCentral = depotCentral === true;
        if (!hasPointVente && !hasRegion && !hasDepotCentral) {
            res
                .status(400)
                .json({ message: "La commande doit être liée à une localisation." });
            return;
        }
        const numero = `CMD-${Date.now()}`;
        const commande = new model_1.Commande({
            numero,
            user,
            region: region || undefined,
            pointVente: pointVente || undefined,
            depotCentral: !!depotCentral,
            produits: [],
            statut: "attente",
        });
        yield commande.save();
        // Crée les lignes et relie-les à la commande
        const createdLignes = yield Promise.all(produits.map((p) => __awaiter(void 0, void 0, void 0, function* () {
            const cp = new model_1.CommandeProduit({
                commandeId: commande._id,
                produit: p.produit,
                quantite: p.quantite,
                uniteMesure: p.uniteMesure,
                statut: "attente",
            });
            yield cp.save();
            return cp._id;
        })));
        commande.produits = createdLignes;
        yield commande.save();
        const populated = yield model_1.Commande.findById(commande._id)
            .populate(commonPopulate)
            .populate({ path: "produits", populate: { path: "produit" } });
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la création de la commande.",
            error: error.message,
        });
    }
});
exports.createCommande = createCommande;
/* ----------------------------------- PUT ----------------------------------- */
const updateCommande = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "id invalide" });
            return;
        }
        const _f = req.body, { produits: produitsUpdates } = _f, updateData = __rest(_f, ["produits"]);
        // 1) Mise à jour de la commande (hors produits)
        const commande = yield model_1.Commande.findByIdAndUpdate(id, updateData, {
            new: true,
        });
        if (!commande) {
            res.status(404).json({ message: "Commande non trouvée." });
            return;
        }
        // 2) Mise à jour des lignes si fournies
        if (Array.isArray(produitsUpdates) && produitsUpdates.length > 0) {
            for (const prodUpdate of produitsUpdates) {
                const { _id: ligneId, statut, quantite, montant } = prodUpdate, rest = __rest(prodUpdate, ["_id", "statut", "quantite", "montant"]);
                if (!ligneId || !mongoose_1.default.Types.ObjectId.isValid(String(ligneId)))
                    continue;
                const ligne = yield model_1.CommandeProduit.findById(ligneId);
                if (!ligne)
                    continue;
                // champs libres
                Object.assign(ligne, rest);
                if (typeof quantite === "number")
                    ligne.quantite = quantite;
                // gestion du statut
                if (statut && statut !== ligne.statut) {
                    if (statut === "livré") {
                        if (ligne.statut !== "livré") {
                            // Création du mouvement stock lié
                            const mouvementData = {
                                produit: ligne.produit,
                                quantite: typeof quantite === "number" ? quantite : ligne.quantite,
                                montant: typeof montant === "number" ? montant : 0,
                                type: "Livraison",
                                statut: true,
                                user: updateData.user || commande.user, // fallback user de la commande
                                commandeId: commande._id,
                                depotCentral: !!((_a = updateData.depotCentral) !== null && _a !== void 0 ? _a : commande.depotCentral),
                            };
                            if ((_b = updateData.pointVente) !== null && _b !== void 0 ? _b : commande.pointVente) {
                                mouvementData.pointVente =
                                    (_c = updateData.pointVente) !== null && _c !== void 0 ? _c : commande.pointVente;
                            }
                            if ((_d = updateData.region) !== null && _d !== void 0 ? _d : commande.region) {
                                mouvementData.region = (_e = updateData.region) !== null && _e !== void 0 ? _e : commande.region;
                            }
                            const mouvement = new model_1.MouvementStock(mouvementData);
                            yield mouvement.save();
                            ligne.mouvementStockId = mouvement._id;
                            ligne.statut = "livré";
                        }
                    }
                    else {
                        // autres transitions de statut
                        ligne.statut = statut;
                    }
                }
                yield ligne.save();
            }
        }
        // 3) Rechargement des lignes pour calcul statut global
        const lignesCmd = yield model_1.CommandeProduit.find({ commandeId: commande._id });
        const tousLivres = lignesCmd.length > 0 && lignesCmd.every((l) => l.statut === "livré");
        if (tousLivres && commande.statut !== "livrée") {
            commande.statut = "livrée";
            yield commande.save();
        }
        // 4) Retourner la commande peuplée
        const populated = yield model_1.Commande.findById(commande._id)
            .populate(commonPopulate)
            .populate({ path: "produits", populate: { path: "produit" } });
        res.status(200).json(populated);
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la mise à jour de la commande.",
            error: error.message,
        });
    }
});
exports.updateCommande = updateCommande;
/* ---------------------------------- DELETE --------------------------------- */
const deleteCommande = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "id invalide" });
            return;
        }
        const deleted = yield model_1.Commande.findByIdAndDelete(id);
        if (!deleted) {
            res.status(404).json({ message: "Commande non trouvée." });
            return;
        }
        // on supprime aussi les lignes associées
        yield model_1.CommandeProduit.deleteMany({ commandeId: id });
        res.status(200).json({ message: "Commande supprimée avec succès." });
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la suppression.",
            error: error.message,
        });
    }
});
exports.deleteCommande = deleteCommande;
