import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { User, UserRoleType } from "../Models/model";
import { generateToken } from "../Utils/jwt";
import { UserRole } from "../Utils/constant";
import { uploadFile } from "../services/uploadService";
import { MulterFile, MulterRequest } from "../Models/multerType";

export const register = async (
  req: MulterRequest,
  res: Response,
): Promise<void> => {
  try {
    const {
      nom,
      prenom,
      telephone,
      email,
      adresse,
      password,
      role,
      region,
      pointVente,
    } = req.body;

    // Vérification unicité email ou téléphone
    const existingUser = await User.findOne({
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
        imagePath = await uploadFile(req.file, role);
      } catch (uploadError) {
        console.error("Erreur d'upload:", uploadError);
        res.status(500).json({ message: "Échec de l'upload de l'image" });
        return;
      }
    }

    // Définir les règles selon le rôle
    const noRegionNoPV: UserRoleType[] = ["SuperAdmin", "Client"];
    const onlyRegion: UserRoleType[] = ["AdminRegion"];
    const needsPointVente: UserRoleType[] = [
      "AdminPointVente",
      "Vendeur",
      "Logisticien",
    ];

    // Validation
    if (!UserRole.includes(role)) {
      res.status(400).json({ message: `Rôle invalide : ${role}` });
      return;
    }

    if (onlyRegion.includes(role as UserRoleType) && !region) {
      res
        .status(400)
        .json({ message: "La région est requise pour un AdminRegion." });
      return;
    }

    if (needsPointVente.includes(role as UserRoleType) && !pointVente) {
      res
        .status(400)
        .json({ message: "Le point de vente est requis pour ce rôle." });
      return;
    }

    // Préparation des données utilisateur
    const userPayload: any = {
      nom,
      prenom,
      telephone,
      email,
      adresse,
      password, // À hasher avec bcrypt en prod
      role,
      image: imagePath,
    };

    if (onlyRegion.includes(role as UserRoleType)) {
      userPayload.region = region;
    }

    if (needsPointVente.includes(role as UserRoleType)) {
      userPayload.pointVente = pointVente;
    }

    const newUser = new User(userPayload);
    const createdUser = await newUser.save();

    res.status(201).json(createdUser);
  } catch (err: unknown) {
    console.error("Erreur lors de l'inscription:", err);
    if (err instanceof Error) {
      res
        .status(500)
        .json({ message: "Erreur lors de l'inscription", error: err.message });
    } else {
      res.status(500).json({ message: "Une erreur inconnue est survenue" });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { telephone, password } = req.body;

    const user = await User.findOne({ telephone })
      .populate("pointVente")
      .populate("region");

    if (!user) {
      res.status(401).json({ message: "Numéro de téléphone incorrect" });
      return;
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({ message: "Mot de passe incorrect" });
      return;
    }

    const token = generateToken(user.id, user.role);
    console.log("Utilisateur connecté:", user);
    res.json({ token, user });
  } catch (err) {
    console.error("Erreur lors du login :", err);
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.json({ message: "Déconnexion réussie" });
};
