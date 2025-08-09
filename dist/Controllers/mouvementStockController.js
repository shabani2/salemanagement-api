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
exports.livrerProduitCommande = exports.getMouvementsStockByRegionOptimizedPage = exports.getMouvementStockByIdPage = exports.getMouvementsStockByPointVentePage = exports.getMouvementStockByRegionPage = exports.getAllMouvementsStockPage = exports.getMouvementsStockAggregatedByPointVente = exports.getMouvementsStockAggregatedByUserId = exports.getMouvementsStockByUserId = exports.getMouvementsStockByPointVenteId = exports.validateState = exports.deleteMouvementStock = exports.updateMouvementStock = exports.createMouvementStock = exports.getMouvementStockById = exports.getMouvementsStockByPointVente = exports.getMouvementStockByRegion = exports.getAllMouvementsStock = void 0;
const model_1 = require("../Models/model");
const mongoose_1 = __importDefault(require("mongoose"));
const getAllMouvementsStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mouvements = yield model_1.MouvementStock.find()
            .sort({ createdAt: -1 })
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
        res.json(mouvements);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllMouvementsStock = getAllMouvementsStock;
const getMouvementStockByRegion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { regionId } = req.params;
        const mouvements = yield model_1.MouvementStock.find()
            .sort({ createdAt: -1 })
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
        const mouvementsFiltres = mouvements.filter((m) => {
            var _a, _b, _c, _d, _e;
            return ((_c = (_b = (_a = m.pointVente) === null || _a === void 0 ? void 0 : _a.region) === null || _b === void 0 ? void 0 : _b._id) === null || _c === void 0 ? void 0 : _c.toString()) === regionId ||
                ((_e = (_d = m.region) === null || _d === void 0 ? void 0 : _d._id) === null || _e === void 0 ? void 0 : _e.toString()) === regionId;
        });
        res.json(mouvementsFiltres);
    }
    catch (err) {
        console.error("Erreur dans getMouvementStockByRegion:", err);
        res
            .status(500)
            .json({ message: "Erreur interne", error: err === null || err === void 0 ? void 0 : err.message });
    }
});
exports.getMouvementStockByRegion = getMouvementStockByRegion;
const getMouvementsStockByPointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pointVenteId } = req.params;
        if (!pointVenteId) {
            res.status(400).json({ message: "ID requis" });
            return;
        }
        const mouvements = yield model_1.MouvementStock.find({
            pointVente: new mongoose_1.default.Types.ObjectId(pointVenteId),
        })
            .sort({ createdAt: -1 })
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        })
            .populate("region")
            .populate({
            path: "user",
            populate: [
                { path: "pointVente", model: "PointVente" },
                { path: "region", model: "Region" },
            ],
        });
        if (!mouvements.length) {
            res.status(404).json({ message: "Aucun mouvement trouvé" });
            return;
        }
        res.json(mouvements);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getMouvementsStockByPointVente = getMouvementsStockByPointVente;
const getMouvementStockById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const mouvement = yield model_1.MouvementStock.findById(id)
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        })
            .populate("region")
            .populate({
            path: "user",
            populate: [
                { path: "pointVente", model: "PointVente" },
                { path: "region", model: "Region" },
            ],
        });
        if (!mouvement) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        res.json(mouvement);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getMouvementStockById = getMouvementStockById;
const createMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pointVente, depotCentral, // Ce champ est un booléen
        produit, type, quantite, montant, statut, region, user, } = req.body;
        // Correction 1: Validation adaptée pour depotCentral (booléen)
        const hasPointVente = !!pointVente;
        const hasRegion = !!region;
        const hasDepotCentral = depotCentral === true; // Seulement true compte comme association
        // Validation: Au moins une entité doit être associée
        if (!hasPointVente && !hasDepotCentral && !hasRegion) {
            res.status(400).json({
                message: "Le mouvement doit être associé à un point de vente, un dépôt central ou une région",
            });
            return;
        }
        // Validation: User doit être présent
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
        };
        // Ajout des champs optionnels
        if (pointVente)
            mouvementData.pointVente = new mongoose_1.default.Types.ObjectId(pointVente);
        if (region)
            mouvementData.region = new mongoose_1.default.Types.ObjectId(region);
        // Correction 2: Toujours inclure depotCentral (booléen)
        mouvementData.depotCentral = !!depotCentral;
        const mouvement = new model_1.MouvementStock(mouvementData);
        yield mouvement.save();
        // Population après création pour la réponse
        const populatedMouvement = yield model_1.MouvementStock.findById(mouvement._id)
            .populate({
            path: "user",
            populate: [
                { path: "pointVente", model: "PointVente" },
                { path: "region", model: "Region" },
            ],
        })
            .populate("region")
            .populate({
            path: "pointVente", // Correction typo: 'pointVente' au lieu de 'pointVente'
            populate: { path: "region", model: "Region" },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        });
        res.status(201).json(populatedMouvement);
    }
    catch (err) {
        // Amélioration du message d'erreur
        res.status(400).json({
            message: "Erreur lors de la création",
            error: err.message,
        });
    }
});
exports.createMouvementStock = createMouvementStock;
const updateMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { pointVente, depotCentral, // Booléen
        produit, type, quantite, montant, statut, region, user, } = req.body;
        // Correction 3: Même validation que pour la création
        const hasPointVente = !!pointVente;
        const hasRegion = !!region;
        const hasDepotCentral = depotCentral === true;
        if (!hasPointVente && !hasDepotCentral && !hasRegion) {
            res.status(400).json({
                message: "Le mouvement doit être associé à un point de vente, un dépôt central ou une région",
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
            user: new mongoose_1.default.Types.ObjectId(user),
        };
        if (pointVente)
            updateData.pointVente = new mongoose_1.default.Types.ObjectId(pointVente);
        if (region)
            updateData.region = new mongoose_1.default.Types.ObjectId(region);
        // Correction 4: Toujours inclure depotCentral
        updateData.depotCentral = !!depotCentral;
        const updated = yield model_1.MouvementStock.findByIdAndUpdate(id, updateData, {
            new: true,
        })
            .populate({
            path: "user",
            populate: [
                { path: "pointVente", model: "PointVente" },
                { path: "region", model: "Region" },
            ],
        })
            .populate("region")
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        });
        if (!updated) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        res.json(updated);
    }
    catch (err) {
        res.status(400).json({
            message: "Erreur lors de la mise à jour",
            error: err.message,
        });
    }
});
exports.updateMouvementStock = updateMouvementStock;
const deleteMouvementStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield model_1.MouvementStock.findByIdAndDelete(id);
        res.json({ message: "Mouvement supprimé avec succès" });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.deleteMouvementStock = deleteMouvementStock;
const validateState = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const mouvement = yield model_1.MouvementStock.findByIdAndUpdate(id, { statut: true }, { new: true })
            .populate({
            path: "user",
            populate: [
                { path: "pointVente", model: "PointVente" },
                { path: "region", model: "Region" },
            ],
        })
            .populate("region")
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        });
        if (!mouvement) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        res.json({ message: "Statut du mouvement mis à jour", mouvement });
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Erreur lors de la validation", error: err });
    }
});
exports.validateState = validateState;
//fonction avec pagination :
const getMouvementsStockByPointVenteId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pointVenteId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        if (!pointVenteId) {
            res.status(400).json({ message: "ID requis" });
            return;
        }
        const total = yield model_1.MouvementStock.countDocuments({
            pointVente: new mongoose_1.default.Types.ObjectId(pointVenteId),
        });
        const mouvements = yield model_1.MouvementStock.find({
            pointVente: new mongoose_1.default.Types.ObjectId(pointVenteId),
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        })
            .populate("region")
            .populate({
            path: "user",
            populate: [
                { path: "pointVente", model: "PointVente" },
                { path: "region", model: "Region" },
            ],
        });
        if (!mouvements.length) {
            res.status(404).json({ message: "Aucun mouvement trouvé" });
            return;
        }
        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            mouvements,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getMouvementsStockByPointVenteId = getMouvementsStockByPointVenteId;
const getMouvementsStockByUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        if (!userId) {
            res.status(400).json({ message: "ID utilisateur requis" });
            return;
        }
        const total = yield model_1.MouvementStock.countDocuments({
            user: new mongoose_1.default.Types.ObjectId(userId),
        });
        const mouvements = yield model_1.MouvementStock.find({
            user: new mongoose_1.default.Types.ObjectId(userId),
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        })
            .populate("region")
            .populate({
            path: "user",
            populate: [
                { path: "pointVente", model: "PointVente" },
                { path: "region", model: "Region" },
            ],
        });
        if (!mouvements.length) {
            res
                .status(404)
                .json({ message: "Aucun mouvement trouvé pour cet utilisateur" });
            return;
        }
        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            mouvements,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getMouvementsStockByUserId = getMouvementsStockByUserId;
// export const getMouvementsStockAggregatedByPointVente = async (req: Request, res: Response) => {
//   try {
//     const { pointVenteId } = req.params;
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = 10;
//     const skip = (page - 1) * limit;
//     if (!pointVenteId) {
//        res.status(400).json({ message: "ID point de vente requis" });
//       return;
//     }
//     // Pipeline d'agrégation avec typage correct (version simple)
//     const aggregationPipeline: PipelineStage[] = [
//       {
//         $match: {
//           pointVente: new mongoose.Types.ObjectId(pointVenteId)
//         }
//       },
//       {
//         $group: {
//           _id: {
//             produit: "$produit",
//             type: "$type"
//           },
//           totalQuantite: { $sum: "$quantite" },
//           totalMontant: { $sum: "$montant" },
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           produit: "$_id.produit",
//           type: "$_id.type",
//           totalQuantite: 1,
//           totalMontant: 1,
//           count: 1
//         }
//       },
//       // Pas de tri ici car nous n'avons pas encore les données du produit
//       {
//         $facet: {
//           metadata: [{ $count: "total" }],
//           data: [{ $skip: skip }, { $limit: limit }]
//         }
//       }
//     ];
//     const result = await MouvementStock.aggregate(aggregationPipeline);
//     const data = result[0]?.data || [];
//     const metadata = result[0]?.metadata || [];
//     const total = metadata.length > 0 ? metadata[0].total : 0;
//     if (!data.length) {
//        res.status(404).json({ message: "Aucun mouvement trouvé" });
//       return;
//     }
//     // Peuplement des références pour les catégories
//     const populatedData = await Promise.all(data.map(async (item: any) => {
//       // Le produit est déjà joint via $lookup, on ajoute juste la catégorie
//       if (item.produitInfo && item.produitInfo.categorie) {
//         const populatedProduit = await Produit.findById(item.produitInfo._id)
//           .populate({ path: "categorie", model: "Categorie" });
//         return {
//           ...item,
//           produit: populatedProduit
//         };
//       }
//       return {
//         ...item,
//         produit: item.produitInfo
//       };
//     }));
//     res.json({
//       total,
//       page,
//       pages: Math.ceil(total / limit),
//       limit,
//       mouvements: populatedData
//     });
//   } catch (err) {
//     console.error('Erreur dans getMouvementsStockAggregatedByPointVente:', err);
//     res.status(500).json({ message: "Erreur interne", error: err });
//     return;
//   }
// };
const getMouvementsStockAggregatedByUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        if (!userId) {
            res.status(400).json({ message: "ID utilisateur requis" });
            return;
        }
        // Pipeline d'agrégation avec typage correct
        const aggregationPipeline = [
            {
                $match: {
                    user: new mongoose_1.default.Types.ObjectId(userId),
                },
            },
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
            // Pas de tri ici car nous n'avons pas encore les données du produit
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
        // Peuplement des références et tri côté application
        const populatedData = yield Promise.all(data.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            const populatedProduit = yield model_1.Produit.findById(item.produit).populate({
                path: "categorie",
                model: "Categorie",
            });
            return Object.assign(Object.assign({}, item), { produit: populatedProduit });
        })));
        // Tri par nom de produit après peuplement
        const sortedData = populatedData.sort((a, b) => {
            var _a, _b;
            const nomA = ((_a = a.produit) === null || _a === void 0 ? void 0 : _a.nom) || "";
            const nomB = ((_b = b.produit) === null || _b === void 0 ? void 0 : _b.nom) || "";
            return nomA.localeCompare(nomB);
        });
        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            mouvements: sortedData,
        });
        return;
    }
    catch (err) {
        console.error("Erreur dans getMouvementsStockAggregatedByUserId:", err);
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.getMouvementsStockAggregatedByUserId = getMouvementsStockAggregatedByUserId;
const getMouvementsStockAggregatedByPointVente = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { pointVenteId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        if (!pointVenteId) {
            res.status(400).json({ message: "ID point de vente requis" });
            return;
        }
        // Pipeline d'agrégation optimisé
        const aggregationPipeline = [
            {
                $match: {
                    pointVente: new mongoose_1.default.Types.ObjectId(pointVenteId),
                },
            },
            // Jointure avec les produits
            {
                $lookup: {
                    from: "produits", // Nom de la collection Produit
                    localField: "produit",
                    foreignField: "_id",
                    as: "produitInfo",
                },
            },
            { $unwind: "$produitInfo" }, // Déroule le tableau produitInfo
            // Jointure avec les catégories
            {
                $lookup: {
                    from: "categories", // Nom de la collection Categorie
                    localField: "produitInfo.categorie",
                    foreignField: "_id",
                    as: "categorieInfo",
                },
            },
            { $unwind: { path: "$categorieInfo", preserveNullAndEmptyArrays: true } },
            // Groupement par produit et type
            {
                $group: {
                    _id: {
                        produitId: "$produit", // Garde l'ID pour le peuplement final
                        type: "$type",
                    },
                    totalQuantite: { $sum: "$quantite" },
                    totalMontant: { $sum: "$montant" },
                    count: { $sum: 1 },
                    // Garde les infos nécessaires pour le peuplement
                    produitData: { $first: "$produitInfo" },
                    categorieData: { $first: "$categorieInfo" },
                },
            },
            // Projection des résultats
            {
                $project: {
                    _id: 0,
                    produit: {
                        _id: "$produitData._id",
                        nom: "$produitData.nom",
                        code: "$produitData.code",
                        // Ajoutez ici d'autres champs nécessaires
                        categorie: "$categorieData",
                    },
                    type: "$_id.type",
                    totalQuantite: 1,
                    totalMontant: 1,
                    count: 1,
                },
            },
            { $sort: { "produit.nom": 1 } }, // Tri par nom de produit
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
            pages: Math.ceil(total / limit),
            limit,
            mouvements: data, // Les données sont déjà peuplées
        });
        return;
    }
    catch (err) {
        console.error("Erreur dans getMouvementsStockAggregatedByPointVente:", err);
        res.status(500).json({ message: "Erreur interne", error: err });
        return;
    }
});
exports.getMouvementsStockAggregatedByPointVente = getMouvementsStockAggregatedByPointVente;
//integration de la pagination
const getAllMouvementsStockPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const total = yield model_1.MouvementStock.countDocuments();
        const mouvements = yield model_1.MouvementStock.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
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
        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            mouvements,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllMouvementsStockPage = getAllMouvementsStockPage;
const getMouvementStockByRegionPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { regionId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        // Récupérer tous les mouvements (avec pagination)
        const allMouvements = yield model_1.MouvementStock.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
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
        // Filtrer après population
        const mouvementsFiltres = allMouvements.filter((m) => {
            var _a, _b, _c, _d, _e;
            return ((_c = (_b = (_a = m.pointVente) === null || _a === void 0 ? void 0 : _a.region) === null || _b === void 0 ? void 0 : _b._id) === null || _c === void 0 ? void 0 : _c.toString()) === regionId ||
                ((_e = (_d = m.region) === null || _d === void 0 ? void 0 : _d._id) === null || _e === void 0 ? void 0 : _e.toString()) === regionId;
        });
        // Compter le total sans pagination pour le filtre
        const allCount = yield model_1.MouvementStock.find()
            .populate("region")
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        });
        const total = allCount.filter((m) => {
            var _a, _b, _c, _d, _e;
            return ((_c = (_b = (_a = m.pointVente) === null || _a === void 0 ? void 0 : _a.region) === null || _b === void 0 ? void 0 : _b._id) === null || _c === void 0 ? void 0 : _c.toString()) === regionId ||
                ((_e = (_d = m.region) === null || _d === void 0 ? void 0 : _d._id) === null || _e === void 0 ? void 0 : _e.toString()) === regionId;
        }).length;
        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            mouvements: mouvementsFiltres,
        });
    }
    catch (err) {
        console.error("Erreur dans getMouvementStockByRegion:", err);
        res
            .status(500)
            .json({ message: "Erreur interne", error: err === null || err === void 0 ? void 0 : err.message });
    }
});
exports.getMouvementStockByRegionPage = getMouvementStockByRegionPage;
const getMouvementsStockByPointVentePage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pointVenteId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        if (!pointVenteId) {
            res.status(400).json({ message: "ID requis" });
            return;
        }
        const total = yield model_1.MouvementStock.countDocuments({
            pointVente: new mongoose_1.default.Types.ObjectId(pointVenteId),
        });
        const mouvements = yield model_1.MouvementStock.find({
            pointVente: new mongoose_1.default.Types.ObjectId(pointVenteId),
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        })
            .populate("region")
            .populate({
            path: "user",
            populate: [
                { path: "pointVente", model: "PointVente" },
                { path: "region", model: "Region" },
            ],
        });
        if (!mouvements.length) {
            res.status(404).json({
                message: "Aucun mouvement trouvé",
                total: 0,
                page,
                pages: 0,
                limit,
            });
            return;
        }
        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            mouvements,
        });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getMouvementsStockByPointVentePage = getMouvementsStockByPointVentePage;
const getMouvementStockByIdPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const mouvement = yield model_1.MouvementStock.findById(id)
            .populate({
            path: "pointVente",
            populate: { path: "region", model: "Region" },
        })
            .populate({
            path: "produit",
            populate: { path: "categorie", model: "Categorie" },
        })
            .populate("region")
            .populate({
            path: "user",
            populate: [
                { path: "pointVente", model: "PointVente" },
                { path: "region", model: "Region" },
            ],
        });
        if (!mouvement) {
            res.status(404).json({ message: "Mouvement non trouvé" });
            return;
        }
        // Pas de pagination pour une entité unique
        res.json(mouvement);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getMouvementStockByIdPage = getMouvementStockByIdPage;
// Nouvelle fonction avec pagination pour les mouvements par région (version optimisée)
const getMouvementsStockByRegionOptimizedPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { regionId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        // Trouver tous les points de vente dans la région
        const pointVentes = yield model_1.PointVente.find({ region: regionId });
        const pointVenteIds = pointVentes.map((pv) => pv._id);
        // Requête unique avec $or
        const query = {
            $or: [{ region: regionId }, { pointVente: { $in: pointVenteIds } }],
        };
        const total = yield model_1.MouvementStock.countDocuments(query);
        const mouvements = yield model_1.MouvementStock.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
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
        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            mouvements,
        });
    }
    catch (err) {
        console.error("Erreur dans getMouvementStockByRegionOptimized:", err);
        res
            .status(500)
            .json({ message: "Erreur interne", error: err === null || err === void 0 ? void 0 : err.message });
    }
});
exports.getMouvementsStockByRegionOptimizedPage = getMouvementsStockByRegionOptimizedPage;
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
        // Recherche du produit dans la commande via le modèle CommandeProduit
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
        // Vérification de tous les produits de la commande
        const produitsCommande = yield model_1.CommandeProduit.find({
            commande: commandeId,
        });
        const tousLivrés = produitsCommande.every((p) => p.statut === "livré");
        if (tousLivrés) {
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
    }
    catch (err) {
        res.status(400).json({
            message: "Erreur lors de la livraison du produit",
            error: err.message,
        });
    }
});
exports.livrerProduitCommande = livrerProduitCommande;
