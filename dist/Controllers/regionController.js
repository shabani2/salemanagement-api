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
exports.getRegionById = exports.deleteRegion = exports.updateRegion = exports.createRegion = exports.getAllRegions = void 0;
const model_1 = require("../Models/model");
const getAllRegions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const regions = yield model_1.Region.aggregate([
            {
                $lookup: {
                    from: "pointventes", // le nom de la collection MongoDB (attention au pluriel et minuscule)
                    localField: "_id",
                    foreignField: "region",
                    as: "pointsVente",
                },
            },
            {
                $addFields: {
                    pointVenteCount: { $size: "$pointsVente" },
                },
            },
            {
                $project: {
                    nom: 1,
                    ville: 1,
                    pointVenteCount: 1,
                    createdAt: 1, // ➕ on ajoute la date de création
                },
            },
        ]);
        res.json(regions);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllRegions = getAllRegions;
const createRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { nom, ville } = req.body;
        const region = new model_1.Region({ nom, ville });
        yield region.save();
        res.status(201).json(region);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createRegion = createRegion;
const updateRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { nom, ville } = req.body;
        // Mise à jour de la région avec validation et retour du document modifié
        const updated = yield model_1.Region.findByIdAndUpdate(id, { nom, ville }, { new: true, runValidators: true });
        if (!updated) {
            res.status(404).json({ message: "Région non trouvée" });
            return;
        }
        res.json(updated);
        return;
    }
    catch (err) {
        res
            .status(400)
            .json({ message: "Erreur lors de la mise à jour", error: err.message });
        return;
    }
});
exports.updateRegion = updateRegion;
const deleteRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield model_1.Region.findByIdAndDelete(id);
        res.json({ message: "Région supprimée avec succès" });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.deleteRegion = deleteRegion;
const getRegionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const region = yield model_1.Region.findById(id);
        if (!region) {
            res.status(404).json({ message: "Région non trouvée" });
            return;
        }
        res.json(region);
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.getRegionById = getRegionById;
