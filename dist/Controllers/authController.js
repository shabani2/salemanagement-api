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
exports.logout = exports.login = exports.register = void 0;
const model_1 = require("../Models/model");
const jwt_1 = require("../Utils/jwt");
const constant_1 = require("../Utils/constant");
const uploadService_1 = require("../services/uploadService");
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { nom, prenom, telephone, email, adresse, password, role, region, pointVente, } = req.body;
        // Vérification unicité email ou téléphone
        const existingUser = yield model_1.User.findOne({
            $or: [{ email }, { telephone }],
        });
        if (existingUser) {
            res.status(400).json({ message: "Email ou téléphone déjà utilisé" });
            return;
        }
        // Upload image
        let imagePath = "";
        if (req.file) {
            try {
                imagePath = yield (0, uploadService_1.uploadFile)(req.file, role);
            }
            catch (uploadError) {
                console.error("Erreur d'upload:", uploadError);
                res.status(500).json({ message: "Échec de l'upload de l'image" });
                return;
            }
        }
        // Définir les règles selon le rôle
        const noRegionNoPV = ["SuperAdmin", "Client"];
        const onlyRegion = ["AdminRegion"];
        const needsPointVente = [
            "AdminPointVente",
            "Vendeur",
            "Logisticien",
        ];
        // Validation
        if (!constant_1.UserRole.includes(role)) {
            res.status(400).json({ message: `Rôle invalide : ${role}` });
            return;
        }
        if (onlyRegion.includes(role) && !region) {
            res
                .status(400)
                .json({ message: "La région est requise pour un AdminRegion." });
            return;
        }
        if (needsPointVente.includes(role) && !pointVente) {
            res
                .status(400)
                .json({ message: "Le point de vente est requis pour ce rôle." });
            return;
        }
        // Préparation des données utilisateur
        const userPayload = {
            nom,
            prenom,
            telephone,
            email,
            adresse,
            password, // À hasher avec bcrypt en prod
            role,
            image: imagePath,
        };
        if (onlyRegion.includes(role)) {
            userPayload.region = region;
        }
        if (needsPointVente.includes(role)) {
            userPayload.pointVente = pointVente;
        }
        const newUser = new model_1.User(userPayload);
        const createdUser = yield newUser.save();
        res.status(201).json(createdUser);
    }
    catch (uploadError) {
        console.error("Erreur d'upload complète:", uploadError);
        res.status(500).json({
            message: "Échec de l'upload de l'image",
            error: uploadError instanceof Error ? uploadError.message : uploadError
        });
    }
    ;
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { telephone, password } = req.body;
        const user = yield model_1.User.findOne({ telephone })
            .populate("pointVente")
            .populate("region");
        if (!user) {
            res.status(401).json({ message: "Numéro de téléphone incorrect" });
            return;
        }
        const isMatch = yield user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ message: "Mot de passe incorrect" });
            return;
        }
        const token = (0, jwt_1.generateToken)(user.id, user.role);
        console.log("Utilisateur connecté:", user);
        res.json({ token, user });
    }
    catch (err) {
        console.error("Erreur lors du login :", err);
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.login = login;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ message: "Déconnexion réussie" });
});
exports.logout = logout;
