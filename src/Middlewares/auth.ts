// file: src/Middlewares/authenticate.ts
import type { RequestHandler } from "express";

import { User } from "../Models/model";
import { verifyToken } from "../Utils/jwt";

// Pourquoi: `RequestHandler` → Promise<void>, pas de retour de Response
export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) {
      res.status(401).json({ message: "Token manquant" });
      return;
    }
    const token = auth.slice(7).trim();
    const payload = verifyToken(token);

    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(401).json({ message: "Utilisateur inexistant" });
      return;
    }
    if (user.isActive === false) {
      res.status(403).json({ message: "Compte désactivé" });
      return;
    }
    if (payload.ver !== user.tokenVersion) {
      res.status(401).json({ message: "Session invalide" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
};
