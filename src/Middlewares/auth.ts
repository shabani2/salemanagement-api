import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../Utils/jwt";
import { User } from "../Models/model";

export interface AuthenticatedRequest extends Request {
  user?: any; // Typage plus strict recommandé (ex: `user?: { id: string, role: string }`)
}

// export const authenticate = (
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction,
// ): void => {
//   const token = req.header("Authorization")?.split(" ")[1];
//   console.log("token : ", token);
//   if (!token) {
//     res.status(401).json({ message: "Accès refusé, token manquant" });
//     return; // 🔹 Assure que la fonction retourne bien `void`
//   }

//   try {
//     const decoded = verifyToken(token);
//     req.user = decoded;
//     next(); // 🔹 Correct, car il retourne bien `void`
//   } catch (err) {
//     res.status(403).json({ message: "Token invalide" });
//     return; // 🔹 Ajouté pour éviter l'erreur de type
//   }
// };











export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Token manquant" });

    const payload = verifyToken(token); // { sub, role, ver }
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Utilisateur inexistant" });
    if (!user.isActive) return res.status(403).json({ message: "Compte désactivé" });
    if (payload.ver !== user.tokenVersion)
      return res.status(401).json({ message: "Session invalide" });

    // @ts-ignore
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Token invalide" });
  }
}