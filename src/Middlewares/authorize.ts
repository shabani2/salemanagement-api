/************** middleware/authorize.ts **************/
import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";

export const authorize =
  (roles: string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Accès interdit" });
      return; // Ajout d'un return explicite pour éviter l'erreur de type
    }
    return next(); // Ajout d'un return pour assurer un type `void`
  };
