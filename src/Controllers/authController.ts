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
  // ✅ Void car Express ne veut pas un Response en retour
  try {
    const { telephone, password } = req.body;
    const user = await User.findOne({ telephone });

    if (!user || !(await user.comparePassword(password))) {
      res
        .status(401)
        .json({ message: "Numéro de téléphone ou mot de passe incorrect" });
      return; // ✅ Fin de la fonction après envoi de réponse
    }

    const token = generateToken(user.id, user.role);
    res.json({ token, user }); // ✅ On envoie la réponse, pas besoin de `return`
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.json({ message: "Déconnexion réussie" });
};
