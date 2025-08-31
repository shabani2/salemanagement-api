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
exports.getDefaultOrganisationLogo =
  exports.deleteOrganisation =
  exports.updateOrganisation =
  exports.createOrganisation =
  exports.getOrganisationById =
  exports.getAllOrganisations =
    void 0;
const path_1 = __importDefault(require("path"));
const model_1 = require("../Models/model");
const uploadService_1 = require("../services/uploadService");
// 🔹 Obtenir toutes les organisations
const getAllOrganisations = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const organisations =
        yield model_1.Organisations.find().populate("superAdmin");
      res.json(organisations);
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getAllOrganisations = getAllOrganisations;
// 🔹 Obtenir une organisation par ID
const getOrganisationById = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const organisation =
        yield model_1.Organisations.findById(id).populate("superAdmin");
      if (!organisation) {
        res.status(404).json({ message: "Organisation non trouvée" });
        return;
      }
      res.json(organisation);
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getOrganisationById = getOrganisationById;
// 🔹 Créer une organisation avec upload de logo
const createOrganisation = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const {
        nom,
        idNat,
        contact,
        numeroImpot,
        devise,
        superAdmin,
        pays,
        emailEntreprise,
      } = req.body;
      let logoUrl = "";
      // Upload du logo si présent
      if (req.file) {
        try {
          logoUrl = yield (0, uploadService_1.uploadFile)(
            req.file,
            "organisations",
          );
        } catch (uploadError) {
          console.error("Erreur d'upload du logo:", uploadError);
          res.status(500).json({ message: "Échec de l'upload du logo" });
          return;
        }
      }
      const organisation = new model_1.Organisations({
        nom,
        idNat,
        contact,
        numeroImpot,
        logo: logoUrl, // Utilisez l'URL ou le chemin retourné
        devise,
        superAdmin,
        pays,
        emailEntreprise,
      });
      yield organisation.save();
      res.status(201).json(organisation);
      return;
    } catch (err) {
      console.error("Erreur création organisation:", err);
      res.status(400).json({
        message: "Erreur lors de la création",
        error: err instanceof Error ? err.message : err,
      });
    }
  });
exports.createOrganisation = createOrganisation;
// 🔹 Mettre à jour une organisation
const updateOrganisation = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const updateData = req.body;
      // Traitement du logo si fourni
      if (req.file) {
        try {
          const logoUrl = yield (0, uploadService_1.uploadFile)(
            req.file,
            "organisations",
          );
          updateData.logo = logoUrl;
          // Optionnel: Supprimer l'ancien logo
          const oldOrg = yield model_1.Organisations.findById(id);
          if (
            (oldOrg === null || oldOrg === void 0 ? void 0 : oldOrg.logo) &&
            process.env.NODE_ENV !== "development"
          ) {
            // Implémentez une fonction deleteFile si nécessaire
            yield (0, uploadService_1.deleteFile)(oldOrg.logo);
          }
        } catch (uploadError) {
          console.error("Erreur d'upload du logo:", uploadError);
          res.status(500).json({ message: "Échec de l'update du logo" });
          return;
        }
      }
      const updated = yield model_1.Organisations.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        },
      ).populate("superAdmin");
      if (!updated) {
        res.status(404).json({ message: "Organisation non trouvée" });
        return;
      }
      res.json(updated);
    } catch (err) {
      console.error("Erreur update organisation:", err);
      res.status(400).json({
        message: "Erreur de mise à jour",
        error: err instanceof Error ? err.message : err,
      });
    }
  });
exports.updateOrganisation = updateOrganisation;
// 🔹 Supprimer une organisation
const deleteOrganisation = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      yield model_1.Organisations.findByIdAndDelete(id);
      res.json({ message: "Organisation supprimée" });
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.deleteOrganisation = deleteOrganisation;
// 🔹 Récupérer le logo de la première organisation
const getDefaultOrganisationLogo = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const organisation = yield model_1.Organisations.findOne().sort({
        _id: 1,
      });
      if (!organisation) {
        res.status(404).json({ message: "Aucune organisation trouvée" });
        return;
      }
      if (!organisation.logo) {
        res
          .status(404)
          .json({ message: "Aucun logo défini pour cette organisation" });
        return;
      }
      const filename = path_1.default.basename(organisation.logo);
      const publicPath = `/assets/organisations/${filename}`;
      res.json({ logoUrl: publicPath });
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getDefaultOrganisationLogo = getDefaultOrganisationLogo;
