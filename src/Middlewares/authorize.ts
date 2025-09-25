// file: src/Middlewares/authorize.ts
import type { RequestHandler } from "express";
import type { IUser } from "../Models/interfaceModels";

// Pourquoi: factory de middleware Express typé
export const authorize = (
  roles: ReadonlyArray<IUser["role"]> | ReadonlyArray<string>,
): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: "Non authentifié" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Accès interdit" });
      return;
    }
    next();
  };
};
