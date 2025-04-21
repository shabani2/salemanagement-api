import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { User } from "../Models/model";
import { generateToken } from "../Utils/jwt";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const register = async (req: MulterRequest, res: Response) => {
  try {
    const { nom, prenom, telephone, email, adresse, password, role } = req.body;
    // Vérifie si l'email ou le téléphone existent déjà
    const existingUser = await User.findOne({
      $or: [{ email }, { telephone }],
    });
    if (existingUser) {
      res.status(400).json({ message: "Email ou téléphone déjà utilisé" });
      return;
    }

    let imagePath = "";
    if (req.file) {
      const uploadDir = path.join(__dirname, `./../assets/${role}`);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      imagePath = `../assets/${role}/${req.file.filename}`;
      const destinationPath = path.join(uploadDir, req.file.filename);
      // Déplacer le fichier vers le bon dossier (optionnel si Multer gère déjà ça)
      fs.renameSync(req.file.path, destinationPath);
    }

    const user = new User({
      nom,
      prenom,
      telephone,
      email,
      adresse,
      password,
      role,
      image: imagePath,
    });
    await user.save();
    res.status(201).json({ message: "Utilisateur créé avec succès" });
    return;
  } catch (err: unknown) {
    if (err instanceof Error) {
      res
        .status(500)
        .json({ message: "Erreur lors de l'inscription", error: err.message });
    } else {
      res.status(500).json({ message: "Une erreur inconnue est survenue" });
    }
    return;
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { telephone, password } = req.body;
    const user = await User.findOne({ telephone });

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
    console.error("Erreur lors du login :", err); // ✅ utile pour diagnostiquer
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.json({ message: "Déconnexion réussie" });
};
