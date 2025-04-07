import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../Utils/jwt";

export interface AuthenticatedRequest extends Request {
  user?: any; // Typage plus strict recommandé (ex: `user?: { id: string, role: string }`)
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const token = req.header("Authorization")?.split(" ")[1];
  console.log("token : ", token);
  if (!token) {
    res.status(401).json({ message: "Accès refusé, token manquant" });
    return; // 🔹 Assure que la fonction retourne bien `void`
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next(); // 🔹 Correct, car il retourne bien `void`
  } catch (err) {
    res.status(403).json({ message: "Token invalide" });
    return; // 🔹 Ajouté pour éviter l'erreur de type
  }
};
