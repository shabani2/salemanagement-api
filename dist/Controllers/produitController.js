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
exports.deleteProduit =
  exports.updateProduit =
  exports.createProduit =
  exports.getProduitById =
  exports.searchProduit =
  exports.getAllProduits =
    void 0;
const model_1 = require("../Models/model");
// 🔹 Obtenir tous les produits
const getAllProduits = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const produits = yield model_1.Produit.find()
        .sort({ createdAt: -1 })
        .populate("categorie");
      res.json(produits);
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getAllProduits = getAllProduits;
const searchProduit = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { q } = req.query; // q pour "query"
    try {
      const produits = yield model_1.Produit.find({
        nom: { $regex: q, $options: "i" }, // recherche insensible à la casse
      })
        .sort({ createdAt: -1 })
        .populate("categorie");
      res.json(produits);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Erreur lors de la recherche", error: err });
    }
  });
exports.searchProduit = searchProduit;
// 🔹 Obtenir un produit par ID
const getProduitById = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const produit = yield model_1.Produit.findById(id).populate("categorie");
      if (!produit) {
        res.status(404).json({ message: "Produit non trouvé" });
        return;
      }
      res.json(produit);
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getProduitById = getProduitById;
// 🔹 Créer un produit
const createProduit = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const {
        nom,
        categorie,
        prix,
        tva,
        prixVente,
        marge,
        netTopay,
        unite,
        seuil,
      } = req.body;
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
      res.status(201).json(produit);
    } catch (err) {
      res
        .status(400)
        .json({ message: "Erreur lors de la création", error: err });
    }
  });
exports.createProduit = createProduit;
// 🔹 Mettre à jour un produit
const updateProduit = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedProduit = yield model_1.Produit.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        },
      ).populate("categorie");
      if (!updatedProduit) {
        res.status(404).json({ message: "Produit non trouvé" });
        return;
      }
      res.json(updatedProduit);
    } catch (err) {
      res.status(400).json({
        message: "Erreur lors de la mise à jour du produit",
        error: err instanceof Error ? err.message : err,
      });
    }
  });
exports.updateProduit = updateProduit;
// 🔹 Supprimer un produit
const deleteProduit = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      yield model_1.Produit.findByIdAndDelete(id);
      res.json({ message: "Produit supprimé avec succès" });
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.deleteProduit = deleteProduit;
