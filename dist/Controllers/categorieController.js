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
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategorie =
  exports.getCategorieById =
  exports.deleteCategorie =
  exports.createCategorie =
  exports.getAllCategories =
    void 0;
const model_1 = require("../Models/model");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const getAllCategories = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const categories = yield model_1.Categorie.find();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getAllCategories = getAllCategories;
const createCategorie = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { nom, type } = req.body;
      let imagePath = "";
      const categorieDir = path_1.default.join(
        __dirname,
        "./../assets/categorie",
      );
      // Vérifier et créer le dossier si nécessaire
      if (!fs_1.default.existsSync(categorieDir)) {
        fs_1.default.mkdirSync(categorieDir, { recursive: true });
      }
      if (req.file) {
        imagePath = `../assets/categorie/${req.file.filename}`;
        const destinationPath = path_1.default.join(
          categorieDir,
          req.file.filename,
        );
        // Déplacer le fichier vers le bon dossier (optionnel si Multer gère déjà ça)
        fs_1.default.renameSync(req.file.path, destinationPath);
      }
      const categorie = new model_1.Categorie({ nom, type, image: imagePath });
      yield categorie.save();
      res.status(201).json(categorie);
    } catch (err) {
      res
        .status(400)
        .json({ message: "Erreur lors de la création", error: err });
    }
  });
exports.createCategorie = createCategorie;
const deleteCategorie = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      yield model_1.Produit.deleteMany({ categorie: id });
      yield model_1.Categorie.findByIdAndDelete(id);
      res.json({ message: "Catégorie et ses produits supprimés avec succès" });
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.deleteCategorie = deleteCategorie;
const getCategorieById = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const categorie = yield model_1.Categorie.findById(id);
      if (!categorie) {
        res.status(404).json({ message: "Catégorie non trouvée" });
        return;
      }
      res.json(categorie);
      return;
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
      return;
    }
  });
exports.getCategorieById = getCategorieById;
const updateCategorie = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const { nom, type } = req.body;
      const categorie = yield model_1.Categorie.findById(id);
      if (!categorie) {
        res.status(404).json({ message: "Catégorie non trouvée" });
        return;
      }
      // Si un nouveau fichier est uploadé, on gère l’upload et on supprime l’ancienne image
      if (req.file) {
        const categorieDir = path_1.default.join(
          __dirname,
          "./../assets/categorie",
        );
        if (!fs_1.default.existsSync(categorieDir))
          fs_1.default.mkdirSync(categorieDir, { recursive: true });
        const newImagePath = `../assets/categorie/${req.file.filename}`;
        fs_1.default.renameSync(
          req.file.path,
          path_1.default.join(categorieDir, req.file.filename),
        );
        if (categorie.image) {
          const oldImageFullPath = path_1.default.join(
            __dirname,
            "..",
            categorie.image,
          );
          if (fs_1.default.existsSync(oldImageFullPath))
            fs_1.default.unlinkSync(oldImageFullPath);
        }
        categorie.image = newImagePath;
      }
      // Mise à jour des champs
      if (nom !== undefined) categorie.nom = nom;
      if (type !== undefined) categorie.type = type;
      yield categorie.save();
      res.json(categorie);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Erreur lors de la mise à jour", error: err });
    }
  });
exports.updateCategorie = updateCategorie;
