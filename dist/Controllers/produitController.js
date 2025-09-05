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
/**
 * GET /produits
 * Pagination + tri + filtres optionnels
 * Query:
 *  - page, limit
 *  - categorie (id)
 *  - minPrice, maxPrice (sur prixVente)
 *  - sortBy (ex: createdAt | nom | prixVente)
 *  - order (asc | desc)
 *  - includeTotal (true/false) : si false, on ne fait pas le countDocuments
 */
const getAllProduits = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
      const sortBy = req.query.sortBy || "createdAt";
      const order = req.query.order === "asc" ? 1 : -1;
      const includeTotal =
        ((_a = req.query.includeTotal) !== null && _a !== void 0
          ? _a
          : "true") === "true";
      const categorie = req.query.categorie || undefined;
      const minPrice =
        req.query.minPrice !== undefined
          ? Number(req.query.minPrice)
          : undefined;
      const maxPrice =
        req.query.maxPrice !== undefined
          ? Number(req.query.maxPrice)
          : undefined;
      const filter = {};
      if (categorie) filter.categorie = categorie;
      if (minPrice !== undefined || maxPrice !== undefined) {
        filter.prixVente = {};
        if (minPrice !== undefined) filter.prixVente.$gte = minPrice;
        if (maxPrice !== undefined) filter.prixVente.$lte = maxPrice;
      }
      const sort = { [sortBy]: order };
      const query = model_1.Produit.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("categorie");
      const [items, total] = yield Promise.all([
        query.exec(),
        includeTotal
          ? model_1.Produit.countDocuments(filter)
          : Promise.resolve(0),
      ]);
      const totalPages = includeTotal
        ? Math.max(1, Math.ceil(total / limit))
        : 1;
      res.json({
        data: items,
        meta: {
          page,
          limit,
          total: includeTotal ? total : items.length,
          totalPages,
          hasPrev: includeTotal ? page > 1 : false,
          hasNext: includeTotal ? page < totalPages : false,
        },
      });
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getAllProduits = getAllProduits;
/**
 * GET /produits/search
 * Recherche + pagination + tri
 * Query:
 *  - q (obligatoire)
 *  - page, limit
 *  - sortBy, order, includeTotal
 *  - (optionnel) categorie, minPrice, maxPrice si tu veux les garder en recherche aussi
 */
const searchProduit = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
      const q =
        (_a = req.query.q) === null || _a === void 0 ? void 0 : _a.trim();
      if (!q) {
        res.status(400).json({ message: "Paramètre 'q' requis" });
        return;
      }
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
      const sortBy = req.query.sortBy || "createdAt";
      const order = req.query.order === "asc" ? 1 : -1;
      const includeTotal =
        ((_b = req.query.includeTotal) !== null && _b !== void 0
          ? _b
          : "true") === "true";
      // Si tu veux autoriser aussi ces filtres en recherche:
      const categorie = req.query.categorie || undefined;
      const minPrice =
        req.query.minPrice !== undefined
          ? Number(req.query.minPrice)
          : undefined;
      const maxPrice =
        req.query.maxPrice !== undefined
          ? Number(req.query.maxPrice)
          : undefined;
      const filter = {
        nom: { $regex: q, $options: "i" },
      };
      if (categorie) filter.categorie = categorie;
      if (minPrice !== undefined || maxPrice !== undefined) {
        filter.prixVente = {};
        if (minPrice !== undefined) filter.prixVente.$gte = minPrice;
        if (maxPrice !== undefined) filter.prixVente.$lte = maxPrice;
      }
      const sort = { [sortBy]: order };
      const query = model_1.Produit.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("categorie");
      const [items, total] = yield Promise.all([
        query.exec(),
        includeTotal
          ? model_1.Produit.countDocuments(filter)
          : Promise.resolve(0),
      ]);
      const totalPages = includeTotal
        ? Math.max(1, Math.ceil(total / limit))
        : 1;
      res.json({
        data: items,
        meta: {
          page,
          limit,
          total: includeTotal ? total : items.length,
          totalPages,
          hasPrev: includeTotal ? page > 1 : false,
          hasNext: includeTotal ? page < totalPages : false,
        },
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Erreur lors de la recherche", error: err });
    }
  });
exports.searchProduit = searchProduit;
/** ---------- Le reste inchangé ---------- */
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
      // Si tu utilises upload.single("image") côté route, tu peux gérer req.file ici si besoin
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
