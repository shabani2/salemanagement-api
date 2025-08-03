"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStockHandler =
  exports.checkStock =
  exports.deleteStock =
  exports.updateStock =
  exports.createStock =
  exports.getStockById =
  exports.getStocksByPointVente =
  exports.getStocksByRegion =
  exports.getAllStocks =
    void 0;
const model_1 = require("../Models/model");
const mongoose_1 = require("mongoose");
// 🔹 Obtenir tous les stocks
const getAllStocks = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const stocks = yield model_1.Stock.find()
        .sort({ createdAt: -1 })
        .populate({
          path: "produit",
          populate: { path: "categorie", model: "Categorie" },
        })
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate("region");
      res.json(stocks);
      return;
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
      return;
    }
  });
exports.getAllStocks = getAllStocks;
const getStocksByRegion = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { regionId } = req.params;
      const stocks = yield model_1.Stock.find()
        .sort({ createdAt: -1 })
        .populate({
          path: "produit",
          populate: { path: "categorie", model: "Categorie" },
        })
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate("region");
      const stocksFiltrés = stocks.filter((s) => {
        var _a, _b, _c, _d, _e;
        return (
          ((_c =
            (_b =
              (_a = s.pointVente) === null || _a === void 0
                ? void 0
                : _a.region) === null || _b === void 0
              ? void 0
              : _b._id) === null || _c === void 0
            ? void 0
            : _c.toString()) === regionId ||
          ((_e =
            (_d = s.region) === null || _d === void 0 ? void 0 : _d._id) ===
            null || _e === void 0
            ? void 0
            : _e.toString()) === regionId
        );
      });
      res.json(stocksFiltrés);
      return;
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
      return;
    }
  });
exports.getStocksByRegion = getStocksByRegion;
const getStocksByPointVente = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { pointVenteId } = req.params;
      if (!pointVenteId) {
        res.status(400).json({ message: "ID du point de vente requis" });
        return;
      }
      const stocks = yield model_1.Stock.find({ pointVente: pointVenteId })
        .sort({ createdAt: -1 })
        .populate({
          path: "produit",
          populate: { path: "categorie", model: "Categorie" },
        })
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate("region");
      res.json(stocks);
      return;
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
      return;
    }
  });
exports.getStocksByPointVente = getStocksByPointVente;
const getStockById = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
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
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
      return;
    }
  });
exports.getStockById = getStockById;
// 🔹 Créer un stock
const createStock = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { produit, quantite, montant, pointVente, depotCentral } = req.body;
      if (!pointVente && depotCentral !== true) {
        res.status(400).json({
          message:
            "Un stock doit être associé à un point de vente ou être marqué comme provenant du dépôt central.",
        });
        return;
      }
      const stock = new model_1.Stock({
        produit,
        quantite,
        montant,
        pointVente: pointVente || undefined,
        depotCentral: depotCentral || false,
      });
      yield stock.save();
      res.status(201).json(stock);
    } catch (err) {
      res
        .status(400)
        .json({ message: "Erreur lors de la création", error: err });
    }
  });
exports.createStock = createStock;
// 🔹 Mettre à jour un stock
const updateStock = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const { produit, quantite, montant, pointVente, depotCentral } = req.body;
      if (!pointVente && depotCentral !== true) {
        res.status(400).json({
          message:
            "Un stock doit être associé à un point de vente ou être marqué comme provenant du dépôt central.",
        });
        return;
      }
      const updated = yield model_1.Stock.findByIdAndUpdate(
        id,
        {
          produit,
          quantite,
          montant,
          pointVente,
          depotCentral,
        },
        { new: true },
      );
      if (!updated) {
        res.status(404).json({ message: "Stock non trouvé" });
        return;
      }
      res.json(updated);
    } catch (err) {
      res
        .status(400)
        .json({ message: "Erreur lors de la mise à jour", error: err });
    }
  });
exports.updateStock = updateStock;
// 🔹 Supprimer un stock
const deleteStock = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      yield model_1.Stock.findByIdAndDelete(id);
      res.json({ message: "Stock supprimé avec succès" });
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.deleteStock = deleteStock;
const checkStock = (type, produitId, pointVenteId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.Types.ObjectId.isValid(produitId)) {
      console.warn("checkStock: produitId invalide", produitId);
      return 0;
    }
    if (pointVenteId && !mongoose_1.Types.ObjectId.isValid(pointVenteId)) {
      console.warn("checkStock: pointVenteId invalide", pointVenteId);
      return 0;
    }
    let query = { produit: produitId };
    if (type === "Livraison") {
      query.depotCentral = true;
    } else if (["Vente", "Commande", "Sortie"].includes(type)) {
      if (!pointVenteId) {
        console.warn("checkStock: pointVenteId manquant pour type", type);
        return 0;
      }
      query.pointVente = pointVenteId;
    } else {
      console.warn("checkStock: type invalide", type);
      return 0;
    }
    console.log("checkStock query", query);
    const stock = yield model_1.Stock.findOne(query);
    console.log(
      "stock result =",
      stock !== null && stock !== void 0 ? stock : "NO STOCK FOUND",
    );
    return (stock === null || stock === void 0 ? void 0 : stock.quantite) || 0;
  });
exports.checkStock = checkStock;
const checkStockHandler = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { type, produitId, quantite, pointVenteId } = req.body;
    if (!type || !produitId || quantite == null) {
      res.status(400).json({ success: false, message: "Paramètres manquants" });
      return;
    }
    try {
      const quantiteDisponible = yield (0, exports.checkStock)(
        type,
        produitId,
        pointVenteId,
      );
      console.log("quantiteDisponible:", quantiteDisponible);
      res.json({
        success: true,
        quantiteDisponible,
        suffisant: quantiteDisponible >= quantite,
      });
      return;
    } catch (error) {
      console.error("Erreur API checkStock:", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
      return;
    }
  });
exports.checkStockHandler = checkStockHandler;
