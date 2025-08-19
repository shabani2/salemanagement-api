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
exports.updateCategorie = exports.deleteCategorie = exports.createCategorie = exports.getAllCategories = void 0;
const model_1 = require("../Models/model");
const uploadService_1 = require("../services/uploadService");
const getAllCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield model_1.Categorie.find();
        res.json(categories);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllCategories = getAllCategories;
// controllers/categories.controller.ts
// Controllers/categorieController.ts
const createCategorie = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        console.log("Content-Type:", req.headers["content-type"]);
        console.log("Body keys:", Object.keys(req.body || {}));
        console.log("Body:", req.body);
        console.log("Has file?", !!req.file, (_a = req.file) === null || _a === void 0 ? void 0 : _a.fieldname, (_b = req.file) === null || _b === void 0 ? void 0 : _b.mimetype, (_c = req.file) === null || _c === void 0 ? void 0 : _c.size);
        const { nom, type } = req.body; // doivent exister ici
        if (!nom || !type) {
            res.status(400).json({ message: "Champs manquants", body: req.body });
            return;
        }
        let imagePath = "";
        if (req.file) {
            imagePath = yield (0, uploadService_1.uploadFile)(req.file, "categorie");
        }
        const categorie = new model_1.Categorie({ nom, type, image: imagePath });
        yield categorie.save();
        res.status(201).json(categorie);
    }
    catch (err) {
        console.error("Erreur création catégorie:", err);
        res
            .status(400)
            .json({ message: "Erreur lors de la création", error: String(err) });
    }
});
exports.createCategorie = createCategorie;
const deleteCategorie = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield model_1.Produit.deleteMany({ categorie: id });
        yield model_1.Categorie.findByIdAndDelete(id);
        res.json({ message: "Catégorie et ses produits supprimés avec succès" });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.deleteCategorie = deleteCategorie;
const updateCategorie = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { nom, type } = req.body;
        const categorie = yield model_1.Categorie.findById(id);
        if (!categorie) {
            res.status(404).json({ message: "Catégorie non trouvée" });
            return;
        }
        // Si un nouveau fichier est uploadé
        if (req.file) {
            // Supprimer l'ancienne image si elle existe
            if (categorie.image) {
                try {
                    yield (0, uploadService_1.deleteFile)(categorie.image);
                }
                catch (deleteErr) {
                    console.warn("Impossible de supprimer l'ancienne image:", deleteErr);
                }
            }
            // Upload de la nouvelle image
            categorie.image = yield (0, uploadService_1.uploadFile)(req.file, "categorie");
        }
        // Mise à jour des champs
        if (nom !== undefined)
            categorie.nom = nom;
        if (type !== undefined)
            categorie.type = type;
        yield categorie.save();
        res.json(categorie);
    }
    catch (err) {
        console.error("Erreur mise à jour catégorie:", err);
        res
            .status(500)
            .json({ message: "Erreur lors de la mise à jour", error: err });
    }
});
exports.updateCategorie = updateCategorie;
