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
exports.updateUser =
  exports.deleteUser =
  exports.getUsersByPointVente =
  exports.getUsersByRegion =
  exports.getAllUsers =
    void 0;
const model_1 = require("../Models/model");
const uploadService_1 = require("../services/uploadService");
// Obtenir tous les utilisateurs (SuperAdmin seulement)
const getAllUsers = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const users = yield model_1.User.find()
        .populate("region") // Région directe de l'utilisateur
        .populate({
          path: "pointVente",
          populate: [
            { path: "region" }, // Région liée au point de vente
            { path: "stock" }, // Stock lié au point de vente
          ],
        })
        .sort({ createdAt: -1 });
      res.json(users);
    } catch (err) {
      console.error("Erreur dans getAllUsers:", err);
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getAllUsers = getAllUsers;
// Obtenir les utilisateurs d'une région (AdminRegion seulement)
const getUsersByRegion = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { regionId } = req.user;
      const users = yield model_1.User.find({ region: regionId })
        .populate({
          path: "pointVente",
          populate: { path: "region" },
        })
        .populate("region");
      const filteredUsers = users.filter((user) => {
        var _a, _b, _c, _d;
        return (
          ((_b =
            (_a = user.region) === null || _a === void 0 ? void 0 : _a._id) ===
            null || _b === void 0
            ? void 0
            : _b.toString()) === regionId ||
          (user.pointVente &&
            ((_d =
              (_c = user.pointVente.region) === null || _c === void 0
                ? void 0
                : _c._id) === null || _d === void 0
              ? void 0
              : _d.toString()) === regionId)
        );
      });
      res.json(filteredUsers);
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
    }
  });
exports.getUsersByRegion = getUsersByRegion;
// Obtenir les utilisateurs d'un point de vente (AdminPointVente seulement)
const getUsersByPointVente = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { pointVenteId } = req.params;
      if (!pointVenteId) {
        res.status(400).json({ message: "ID du point de vente requis" });
        return;
      }
      const users = yield model_1.User.find({ pointVente: pointVenteId })
        .populate("region")
        .populate({
          path: "pointVente",
          populate: [{ path: "region" }, { path: "stock" }],
        })
        .sort({ createdAt: -1 });
      res.json(users);
      return;
    } catch (err) {
      console.error("Erreur dans getUsersByPointVente:", err);
      res.status(500).json({ message: "Erreur interne", error: err });
      return;
    }
  });
exports.getUsersByPointVente = getUsersByPointVente;
// Supprimer un utilisateur (SuperAdmin, AdminRegion, AdminPointVente selon les droits)
const deleteUser = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { userId } = req.params;
      const user = yield model_1.User.findById(userId);
      if (!user) {
        res.status(404).json({ message: "Utilisateur non trouvé" });
        return; // 🔹 Ajout du `return;` pour garantir `void`
      }
      if (
        req.user.role === "SuperAdmin" ||
        (req.user.role === "AdminRegion" &&
          user.region === req.user.regionId) ||
        (req.user.role === "AdminPointVente" &&
          user.pointVente === req.user.pointVente)
      ) {
        yield model_1.User.findByIdAndDelete(userId);
        res.json({ message: "Utilisateur supprimé avec succès" });
        return; // 🔹 Ajout du `return;` pour éviter l’erreur TypeScript
      }
      res.status(403).json({ message: "Accès refusé" });
      return; // 🔹 Ajout du `return;` pour s'assurer que la fonction ne retourne pas `Response`
    } catch (err) {
      res.status(500).json({ message: "Erreur interne", error: err });
      return; // 🔹 Ajout du `return;`
    }
  });
exports.deleteUser = deleteUser;
// Mettre à jour son profil (Tous les utilisateurs)
const updateUser = (
  req, // Utilise le même type que register
  res,
) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
      console.log("🔹 Requête reçue pour mise à jour", req.body);
      console.log("🔹 Fichier reçu:", req.file);
      console.log(
        "🔹 ID utilisateur:",
        (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
      );
      const {
        _id,
        nom,
        prenom,
        email,
        adresse,
        telephone,
        role,
        pointVente,
        region,
      } = req.body;
      // Vérifier si l'utilisateur existe avant la mise à jour
      const user = yield model_1.User.findById(_id);
      if (!user) {
        console.log("❌ Utilisateur non trouvé !");
        res.status(404).json({ message: "Utilisateur non trouvé" });
        return;
      }
      console.log("✅ Utilisateur trouvé:", user);
      const updateFields = {};
      if (nom) updateFields.nom = nom;
      if (prenom) updateFields.prenom = prenom;
      if (adresse) updateFields.adresse = adresse;
      if (role) updateFields.role = role;
      if (pointVente) updateFields.pointVente = pointVente;
      if (region) updateFields.region = region;
      // Gestion de l'image - MÊME LOGIQUE QUE DANS REGISTER
      if (req.file) {
        try {
          // Upload de la nouvelle image avec le même rôle que register
          const imagePath = yield (0, uploadService_1.uploadFile)(
            req.file,
            role || user.role,
          );
          updateFields.image = imagePath;
          console.log("✅ Nouvelle image uploadée:", imagePath);
        } catch (uploadError) {
          console.error("❌ Erreur d'upload:", uploadError);
          res.status(500).json({ message: "Échec de l'upload de l'image" });
          return;
        }
      }
      // Si pas de nouveau fichier, on garde l'image existante (pas besoin de la modifier)
      // ✅ Vérifier uniquement si le numéro de téléphone a changé
      if (telephone && telephone !== user.telephone) {
        console.log("🔍 Vérification de l'unicité du numéro 1 = ", telephone);
        console.log(
          "🔍 Vérification de l'unicité du numéro 2 = ",
          user.telephone,
        );
        const existingUser = yield model_1.User.findOne({
          $or: [{ telephone }, { email: telephone }],
        });
        // ❌ Bloquer seulement si un autre utilisateur a ce numéro
        if (
          existingUser &&
          existingUser._id.toString() !== user._id.toString()
        ) {
          console.log("❌ Le numéro de téléphone ou l'email est déjà utilisé");
          res.status(400).json({
            message: "Le numéro de téléphone ou l'email est déjà utilisé",
          });
          return;
        }
        updateFields.telephone = telephone;
        updateFields.email = telephone;
      }
      console.log("🔹 Champs mis à jour:", updateFields);
      // Si aucun champ n'est modifié, ne rien faire
      if (Object.keys(updateFields).length === 0) {
        console.log("ℹ️ Aucun changement détecté.");
        res.status(200).json({ message: "Aucune modification effectuée." });
        return;
      }
      // Mise à jour de l'utilisateur
      const updatedUser = yield model_1.User.findByIdAndUpdate(
        _id,
        { $set: updateFields },
        { new: true, runValidators: true },
      );
      if (!updatedUser) {
        console.log("❌ Échec de la mise à jour de l'utilisateur");
        res
          .status(500)
          .json({ message: "Échec de la mise à jour de l'utilisateur" });
        return;
      }
      console.log("✅ Mise à jour réussie:", updatedUser);
      res.json(updatedUser);
    } catch (err) {
      console.error("❌ Erreur lors de la mise à jour de l'utilisateur:", err);
      res.status(500).json({
        message: "Erreur interne",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
exports.updateUser = updateUser;
