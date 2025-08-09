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
exports.updatePointVente = exports.getPointVenteById = exports.deletePointVente = exports.createPointVente = exports.getPointVentesByRegion = exports.getAllPointVentes = void 0;
const model_1 = require("../Models/model");
const getAllPointVentes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pointsVente = yield model_1.PointVente.find()
            .populate("region")
            .populate("stock.produit");
        res.json(pointsVente);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllPointVentes = getAllPointVentes;
const getPointVentesByRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { regionId } = req.params;
        const pointsVente = yield model_1.PointVente.find({ region: regionId }).populate("region");
        //.populate("stock.produit");
        const filteredPointsVente = pointsVente.filter((point) => { var _a, _b; return ((_b = (_a = point.region) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) === regionId; });
        res.json(filteredPointsVente);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getPointVentesByRegion = getPointVentesByRegion;
const createPointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { nom, adresse, region } = req.body;
        const pointVente = new model_1.PointVente({ nom, adresse, region });
        yield pointVente.save();
        res.status(201).json(pointVente);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createPointVente = createPointVente;
const deletePointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield model_1.Produit.deleteMany({ pointVente: id });
        yield model_1.PointVente.findByIdAndDelete(id);
        res.json({
            message: "Point de vente et ses produits supprimés avec succès",
        });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.deletePointVente = deletePointVente;
const getPointVenteById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const pointVente = yield model_1.PointVente.findById(id);
        if (!pointVente) {
            res.status(404).json({ message: "Point de vente non trouvé" });
        }
        res.json(pointVente);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getPointVenteById = getPointVenteById;
const updatePointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const updatedPointVente = yield model_1.PointVente.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedPointVente) {
            res.status(404).json({ message: "Point de vente non trouvé" });
            return;
        }
        res.json({
            message: "Point de vente mis à jour avec succès",
            pointVente: updatedPointVente,
        });
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.updatePointVente = updatePointVente;
