// file: src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { uploadFile } from "../services/uploadService"; // ton service existant
import { generateRawToken, sha256 } from "../Utils/token";
import { User, UserRoleType } from "../Models/model";
import { IUser } from "../Models/interfaceModels";
import { generateToken } from "../Utils/jwt";
import { sendEmail } from "../Utils/emailService";
import { USER_ROLES } from "../Utils/constant";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const VERIFY_EXP_MINUTES = Number(process.env.VERIFY_EXP_MINUTES || 60 * 24);
const RESET_EXP_MINUTES = Number(process.env.RESET_EXP_MINUTES || 15);

const minutesFromNow = (mins: number) => new Date(Date.now() + mins * 60 * 1000);

export const register = async (req: any, res: Response) => {
  try {
    const { nom, prenom, telephone, email, adresse, role, region, pointVente } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { telephone }] });
    if (existingUser) {
      res.status(400).json({ message: "Email ou téléphone déjà utilisé" });
      return;
    }

    let imagePath = "";
    if (req.file) {
      try {
        imagePath = await uploadFile(req.file, role);
      } catch {
        res.status(500).json({ message: "Échec de l'upload de l'image" });
        return;
      }
    }

    const onlyRegion: UserRoleType[] = ["AdminRegion"];
    const needsPointVente: UserRoleType[] = ["AdminPointVente", "Vendeur", "Logisticien"];

    if (!USER_ROLES.includes(role)) {
      res.status(400).json({ message: `Rôle invalide : ${role}` });
      return;
    }
    if (onlyRegion.includes(role) && !region) {
      res.status(400).json({ message: "La région est requise pour un AdminRegion." });
      return;
    }
    if (needsPointVente.includes(role) && !pointVente) {
      res.status(400).json({ message: "Le point de vente est requis pour ce rôle." });
      return;
    }

    const userPayload: Partial<IUser> = {
      nom, prenom, telephone, email, adresse, role, firstConnection: true, emailVerified: false,
      isActive: true, image: imagePath,
    } as any;
    if (onlyRegion.includes(role)) (userPayload as any).region = region;
    if (needsPointVente.includes(role)) (userPayload as any).pointVente = pointVente;

    const user = await new User(userPayload).save();

    const raw = generateRawToken(32);
    user.emailVerifyTokenHash = sha256(raw);
    user.emailVerifyTokenExpires = minutesFromNow(VERIFY_EXP_MINUTES);
    await user.save();

    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${raw}&id=${user.id}`;
    const html = `
      <p>Bonjour ${user.prenom},</p>
      <p>Confirmez votre email pour activer votre compte.</p>
      <p><a href="${verifyUrl}">Confirmer mon email</a></p>
      <p>Le lien expire dans ${VERIFY_EXP_MINUTES} minutes.</p>
    `;
    await sendEmail(user.email, "Confirmez votre email", html);

    res.status(201).json({ message: "Compte créé. Vérifiez votre email pour activer le compte." });
  } catch (e) {
    res.status(500).json({ message: "Erreur interne" });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token, id } = req.query as { token: string; id: string };
    if (!token || !id) {
      res.status(400).send("Lien invalide");
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(400).send("Lien invalide");
      return;
    }
    if (!user.emailVerifyTokenHash || !user.emailVerifyTokenExpires) {
      res.status(400).send("Lien expiré");
      return;
    }
    if (user.emailVerifyTokenExpires.getTime() < Date.now()) {
      res.status(400).send("Lien expiré");
      return;
    }
    if (sha256(token) !== user.emailVerifyTokenHash) {
      res.status(400).send("Lien invalide");
      return;
    }

    user.emailVerified = true;
    user.emailVerifyTokenHash = null;
    user.emailVerifyTokenExpires = null;

    const rawReset = generateRawToken(32);
    user.resetPasswordTokenHash = sha256(rawReset);
    user.resetPasswordTokenExpires = minutesFromNow(RESET_EXP_MINUTES);
    await user.save();

    const redirectUrl = `${FRONTEND_URL}/reset-password?token=${rawReset}&id=${user.id}&first=1`;
    res.redirect(302, redirectUrl);
  } catch {
    res.status(500).send("Erreur interne");
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, id, password } = req.body as { token: string; id: string; password: string };
    if (!token || !id || !password) {
      res.status(400).json({ message: "Paramètres manquants" });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(400).json({ message: "Lien invalide" });
      return;
    }
    if (!user.resetPasswordTokenHash || !user.resetPasswordTokenExpires) {
      res.status(400).json({ message: "Lien expiré" });
      return;
    }
    if (user.resetPasswordTokenExpires.getTime() < Date.now()) {
      res.status(400).json({ message: "Lien expiré" });
      return;
    }
    if (sha256(token) !== user.resetPasswordTokenHash) {
      res.status(400).json({ message: "Lien invalide" });
      return;
    }

    user.password = password; // hook pre-save hash
    user.firstConnection = false;
    user.resetPasswordTokenHash = null;
    user.resetPasswordTokenExpires = null;
    user.tokenVersion += 1; // Pourquoi: invalider tous anciens JWT
    await user.save();

    res.status(200).json({ message: "Mot de passe mis à jour. Vous pouvez vous connecter." });
  } catch {
    res.status(500).json({ message: "Erreur interne" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    const user = await User.findOne({ email });
    if (!user) {
      res.status(200).json({ message: "Si un compte existe, un email a été envoyé." });
      return;
    }

    const raw = generateRawToken(32);
    user.resetPasswordTokenHash = sha256(raw);
    user.resetPasswordTokenExpires = minutesFromNow(RESET_EXP_MINUTES);
    await user.save();

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${raw}&id=${user.id}`;
    const html = `
      <p>Bonjour ${user.prenom},</p>
      <p>Pour réinitialiser votre mot de passe, cliquez sur:</p>
      <p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
      <p>Le lien expire dans ${RESET_EXP_MINUTES} minutes.</p>
    `;
    await sendEmail(user.email, "Réinitialisation de mot de passe", html);

    res.status(200).json({ message: "Si un compte existe, un email a été envoyé." });
  } catch {
    res.status(500).json({ message: "Erreur interne" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { telephone, password } = req.body;
    const user = await User.findOne({ telephone }).populate("pointVente").populate("region");
    if (!user) {
      res.status(401).json({ message: "Numéro de téléphone incorrect" });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ message: "Compte désactivé" });
      return;
    }
    if (!user.emailVerified) {
      res.status(403).json({ message: "Email non vérifié" });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: "Mot de passe incorrect" });
      return;
    }

    const token = generateToken(user);
    res.json({ token, user });
  } catch {
    res.status(500).json({ message: "Erreur interne" });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.json({ message: "Déconnexion réussie" });
};

export const softDeleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "Utilisateur introuvable" });
      return;
    }
    user.isActive = false;
    user.tokenVersion += 1; // Pourquoi: invalider sessions actives
    await user.save();
    res.status(200).json({ message: "Utilisateur désactivé" });
  } catch {
    res.status(500).json({ message: "Erreur interne" });
  }
};