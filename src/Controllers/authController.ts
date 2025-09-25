// file: src/controllers/auth.controller.ts
import { Request, RequestHandler, Response } from "express";
import { uploadFile } from "../services/uploadService";
import { generateRawToken, sha256 } from "../Utils/token"; // ← conservé si tu veux garder verifyEmail pour legacy
import { User, UserRoleType } from "../Models/model";
import { IUser } from "../Models/interfaceModels";
import { generateToken } from "../Utils/jwt";
import { USER_ROLES } from "../Utils/constant";
import type { MulterRequest } from "../Models/multerType";
import { resolveFrontendBaseUrl } from "../Utils/publicUrl";
import { sendEmail } from "../Utils/emailService";

/* ------------------------------- Constantes ------------------------------- */
const VERIFY_EXP_MINUTES = Number(process.env.VERIFY_EXP_MINUTES || 30); // utile seulement pour verifyEmail (legacy)
const RESET_EXP_MINUTES  = Number(process.env.RESET_EXP_MINUTES  || 30);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalize = (v?: string) => String(v ?? "").trim();
const normalizeEmail = (v?: string) => normalize(v).toLowerCase();
/** MDP temporaire simple (8 chiffres) */
const generateNumericPassword = (len = 8): string =>
  Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");

/* -------------------------------- Register -------------------------------- */
export const register: RequestHandler = async (req, res) => {
  const mreq = req as MulterRequest;
  try {
    // Normalize basique
    const nom        = normalize((mreq.body as any)?.nom);
    const prenom     = normalize((mreq.body as any)?.prenom);
    const telephone  = normalize((mreq.body as any)?.telephone);
    const email      = normalizeEmail((mreq.body as any)?.email);
    const adresse    = normalize((mreq.body as any)?.adresse);
    const role       = normalize((mreq.body as any)?.role) as IUser["role"];
    const region     = normalize((mreq.body as any)?.region);
    const pointVente = normalize((mreq.body as any)?.pointVente);

    if (!emailRegex.test(email)) {
      res.status(400).json({ message: "Email invalide" });
      return;
    }

    // Unicité email/téléphone
    const existingUser = await User.findOne({ $or: [{ email }, { telephone }] });
    if (existingUser) {
      res.status(400).json({ message: "Email ou téléphone déjà utilisé" });
      return;
    }

    // Image (optionnel)
    let imagePath = "";
    if (mreq.file) {
      try {
        imagePath = await uploadFile(mreq.file, role);
      } catch {
        res.status(500).json({ message: "Échec de l'upload de l'image" });
        return;
      }
    }

    // Règles de rôle
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

    // Mot de passe temporaire (sera hashé par le pre-save hook)
    const tempPassword = generateNumericPassword(8);

    // ✅ Bypass: on crée le compte déjà vérifié
    const userPayload: Partial<IUser> & { password: string } = {
      nom,
      prenom,
      telephone,
      email,
      adresse,
      role,
      image: imagePath,
      firstConnection: true,
      emailVerified: true,  // ← compte déjà vérifié
      isActive: true,
      password: tempPassword,
      // emailVerifyTokenHash / Expires restent null par défaut
    };
    if (onlyRegion.includes(role))   (userPayload as any).region = region;
    if (needsPointVente.includes(role)) (userPayload as any).pointVente = pointVente;

    const user = await new User(userPayload).save();

    // Plus de génération de token de vérification ni d’email de vérif.
    // On envoie juste un email d’onboarding avec le mot de passe temporaire.
    const frontendBase = resolveFrontendBaseUrl(mreq);
    const loginUrl = `${frontendBase}/login`;

    const html = `
      <p>Bonjour ${user.prenom ?? user.nom ?? "utilisateur"},</p>
      <p>Votre compte a été créé et est déjà actif.</p>
      <p><strong>Mot de passe temporaire :</strong> <code>${tempPassword}</code></p>
      <p>Vous pouvez vous connecter dès maintenant : <a href="${loginUrl}">${loginUrl}</a></p>
      <p>Il pourra vous être demandé de changer ce mot de passe lors de votre première connexion.</p>
    `;
    await sendEmail(user.email, "Votre compte est prêt", html);

    res.status(201).json({ message: "Compte créé. Un email contenant le mot de passe temporaire a été envoyé." });
  } catch (err) {
    console.error("register/sendEmail error:", err);
    res.status(500).json({ message: "Erreur interne" });
  }
};

/* ------------------------------- Verify Email (legacy / optionnel) -------- */
export const verifyEmail: RequestHandler = async (req, res) => {
  try {
    const { token, id } = req.query as { token?: string; id?: string };
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

    // Générer un reset token court pour encourager le changement de mdp
    const rawReset = generateRawToken(32);
    user.resetPasswordTokenHash = sha256(rawReset);
    user.resetPasswordTokenExpires = new Date(Date.now() + RESET_EXP_MINUTES * 60_000);
    await user.save();

    const base = resolveFrontendBaseUrl(req);
    const redirectUrl = `${base}/reset-password?token=${rawReset}&id=${user.id}&first=1`;
    res.redirect(302, redirectUrl);
  } catch {
    res.status(500).send("Erreur interne");
  }
};

/* ------------------------------- Reset Password ---------------------------- */
export const resetPassword: RequestHandler = async (req, res) => {
  try {
    const { token, id, password } = req.body as { token?: string; id?: string; password?: string };
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

    user.password = password; // hashé par pre-save
    user.firstConnection = false;
    user.resetPasswordTokenHash = null;
    user.resetPasswordTokenExpires = null;
    user.tokenVersion += 1; // invalider anciens JWT
    await user.save();

    res.status(200).json({ message: "Mot de passe mis à jour. Vous pouvez vous connecter." });
  } catch {
    res.status(500).json({ message: "Erreur interne" });
  }
};

/* ---------------------------------- Login ---------------------------------- */
export const login: RequestHandler = async (req, res) => {
  try {
    const email    = normalizeEmail((req.body as any)?.email);
    const password = normalize((req.body as any)?.password);

    if (!email || !password) {
      res.status(400).json({ message: "Email et mot de passe requis" });
      return;
    }
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: "Email invalide" });
      return;
    }

    const user = await User.findOne({ email })
      .populate("pointVente")
      .populate("region");

    if (!user) {
      res.status(401).json({ message: "Adresse email incorrecte" });
      return;
    }
    if (user.isActive === false) {
      res.status(403).json({ message: "Compte désactivé" });
      return;
    }

    // ✅ Plus de blocage sur la vérification d'email
    // (les nouveaux comptes sont créés avec emailVerified=true)

    const isMatch = await (user as any).comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: "Mot de passe incorrect" });
      return;
    }

    const token = generateToken(user);
    res.json({ token, user, needsEmailVerification: false });
  } catch (err) {
    console.error("Erreur lors du login:", err);
    res.status(500).json({ message: "Erreur interne" });
  }
};

/* --------------------------------- Logout --------------------------------- */
export const logout: RequestHandler = async (_req, res) => {
  res.json({ message: "Déconnexion réussie" });
};

/* ------------------------------- Soft Delete ------------------------------- */
export const softDeleteUser: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params as { id?: string };
    if (!id) {
      res.status(400).json({ message: "ID requis" });
      return;
    }
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: "Utilisateur introuvable" });
      return;
    }
    user.isActive = false;
    user.tokenVersion += 1; // invalider sessions actives
    await user.save();
    res.status(200).json({ message: "Utilisateur désactivé" });
  } catch {
    res.status(500).json({ message: "Erreur interne" });
  }
};

/* ------------------------------- Forgot Password --------------------------- */
/** Envoie par EMAIL un mot de passe temporaire (8 chiffres), force firstConnection=true */
export const forgotPassword: RequestHandler = async (req, res) => {
  try {
    const normEmail = normalizeEmail((req.body as any)?.email);

    // Réponse générique pour éviter l’énumération
    if (!emailRegex.test(normEmail)) {
      res.status(200).json({ message: "Si un compte existe, un email a été envoyé." });
      return;
    }

    const user = await User.findOne({ email: normEmail });
    if (!user) {
      res.status(200).json({ message: "Si un compte existe, un email a été envoyé." });
      return;
    }

    const tempPwd = generateNumericPassword(8);

    // Sauvegarde: hash via hook pre-save
    user.password = tempPwd;
    user.firstConnection = true;   // forcer le changement au prochain login
    user.tokenVersion += 1;        // invalider les sessions/JWT actifs
    user.resetPasswordTokenHash = null;
    user.resetPasswordTokenExpires = null;
    await user.save();

    const appName = process.env.APP_NAME ?? "Agricap";
    const html = `
      <p>Bonjour ${user.prenom ?? user.nom ?? ""},</p>
      <p>Voici votre <strong>mot de passe temporaire</strong> : <code>${tempPwd}</code></p>
      <p>Utilisez-le pour vous connecter, puis changez-le dans votre profil.</p>
      <p>Cet email est envoyé automatiquement par ${appName}.</p>
    `;
    await sendEmail(user.email, "Votre mot de passe temporaire", html);

    res.status(200).json({ message: "Si un compte existe, un email a été envoyé." });
  } catch (err) {
    console.error("forgotPassword/sendEmail error:", err);
    res.status(500).json({ message: "Erreur interne" });
  }
};
