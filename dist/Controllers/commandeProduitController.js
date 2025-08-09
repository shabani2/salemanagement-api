"use strict";
// controllers/commandeProduitController.ts
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
exports.updateCommandeProduit = exports.deleteCommande = exports.createCommande = exports.getCommandeById = exports.getCommandeProduitsByRegion = exports.getCommandeProduitsByPointVente = exports.getCommandeProduitsByUser = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../Models/model");
const getCommandeProduitsByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const commandes = yield model_1.Commande.find({ user: userId });
        const commandeIds = commandes.map((cmd) => cmd._id);
        const produits = yield model_1.CommandeProduit.find({
            commandeId: { $in: commandeIds },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        })
            .populate("commandeId")
            .populate({
            path: "commandeId",
            populate: {
                path: "pointVente",
                populate: { path: "region", model: "Region" },
            },
        })
            .populate({
            path: "commandeId",
            populate: { path: "user", select: "-password" },
        })
            .populate("commandeId.region");
        res.status(200).json(produits);
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la récupération des produits par utilisateur.",
            error: error.message,
        });
    }
});
exports.getCommandeProduitsByUser = getCommandeProduitsByUser;
const getCommandeProduitsByPointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pointVenteId } = req.params;
        const commandes = yield model_1.Commande.find({ pointVente: pointVenteId });
        const commandeIds = commandes.map((cmd) => cmd._id);
        const produits = yield model_1.CommandeProduit.find({
            commandeId: { $in: commandeIds },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        })
            .populate({
            path: "commandeId",
            populate: [
                { path: "user", select: "-password" },
                { path: "region" },
                {
                    path: "pointVente",
                    populate: { path: "region", model: "Region" },
                },
            ],
        });
        res.status(200).json(produits);
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la récupération des produits par point de vente.",
            error: error.message,
        });
    }
});
exports.getCommandeProduitsByPointVente = getCommandeProduitsByPointVente;
const getCommandeProduitsByRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { regionId } = req.params;
        const commandes = yield model_1.Commande.find({ region: regionId });
        const commandeIds = commandes.map((cmd) => cmd._id);
        const produits = yield model_1.CommandeProduit.find({
            commandeId: { $in: commandeIds },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        })
            .populate({
            path: "commandeId",
            populate: [
                { path: "user", select: "-password" },
                { path: "region" },
                {
                    path: "pointVente",
                    populate: { path: "region", model: "Region" },
                },
            ],
        });
        res.status(200).json(produits);
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la récupération des produits par région.",
            error: error.message,
        });
    }
});
exports.getCommandeProduitsByRegion = getCommandeProduitsByRegion;
const getCommandeById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { commandeId } = req.params;
        const commande = yield model_1.Commande.findById(commandeId)
            .populate("user", "-password")
            .populate("region")
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        });
        if (!commande) {
            res.status(404).json({ message: "Commande non trouvée." });
            return;
        }
        const produits = yield model_1.CommandeProduit.find({ commandeId }).populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        });
        res.status(200).json({ commande, produits });
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la récupération de la commande.",
            error: error.message,
        });
    }
});
exports.getCommandeById = getCommandeById;
const createCommande = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user, pointVente, region, depotCentral, produits } = req.body;
        if (!user ||
            !produits ||
            !Array.isArray(produits) ||
            produits.length === 0) {
            res.status(400).json({ message: "Utilisateur et produits sont requis." });
        }
        if (!pointVente && !region && !depotCentral) {
            res
                .status(400)
                .json({ message: "La commande doit être liée à une localisation." });
        }
        const numero = `CMD-${Date.now()}`;
        const commande = yield new model_1.Commande({
            numero,
            user,
            pointVente,
            region,
            depotCentral: !!depotCentral,
            statut: "attente",
        }).save();
        const produitsInput = produits;
        const commandeProduits = yield model_1.CommandeProduit.insertMany(produitsInput.map((p) => ({
            commandeId: commande._id,
            produit: new mongoose_1.default.Types.ObjectId(p.produit),
            quantite: p.quantite,
            statut: "attente",
        })));
        const fullCommande = yield model_1.Commande.findById(commande._id)
            .populate("user", "-password")
            .populate("region")
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        });
        res
            .status(201)
            .json({ commande: fullCommande, produits: commandeProduits });
        return;
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la création.",
            error: error.message,
        });
    }
});
exports.createCommande = createCommande;
const deleteCommande = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { commandeId } = req.params;
        const deleted = yield model_1.Commande.findByIdAndDelete(commandeId);
        if (!deleted) {
            res.status(404).json({ message: "Commande non trouvée." });
            return;
        }
        yield model_1.CommandeProduit.deleteMany({ commandeId });
        res
            .status(200)
            .json({ message: "Commande et produits supprimés avec succès." });
        return;
    }
    catch (error) {
        res.status(400).json({
            message: "Erreur lors de la suppression.",
            error: error.message,
        });
    }
});
exports.deleteCommande = deleteCommande;
// PUT /commande-produits/:id
const updateCommandeProduit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { produit, quantite, statut, mouvementStockId } = req.body;
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ID invalide" });
    }
    try {
        const updated = yield model_1.CommandeProduit.findByIdAndUpdate(id, Object.assign(Object.assign(Object.assign(Object.assign({}, (produit && { produit })), (quantite !== undefined && { quantite })), (statut && { statut })), (mouvementStockId !== undefined && { mouvementStockId })), { new: true });
        if (!updated) {
            return res.status(404).json({ message: "CommandeProduit non trouvé" });
        }
        res.status(200).json(updated);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur lors de la mise à jour", error });
    }
});
exports.updateCommandeProduit = updateCommandeProduit;
/**
 * DELETE /commande-produits/:commandeId
 */
