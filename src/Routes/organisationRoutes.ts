import express from "express";
import multer from "multer";
import path from "path";
import {
  createOrganisation,
  deleteOrganisation,
  getAllOrganisations,
  getDefaultOrganisationLogo,
  getOrganisationById,
  updateOrganisation,
} from "../Controllers/organisationController";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";

const organisationRoutes = express.Router();

// Configuration Multer optimisée pour GCS et développement
const storage = multer.memoryStorage(); // Utilisez toujours memoryStorage
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Autoriser seulement les images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont autorisées!"));
    }
  },
});

// Middleware de gestion d'erreurs pour Multer
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ message: err.message });
    return;
  } else if (err) {
    res.status(400).json({ message: err.message });
    return;
  }
  next();
};

organisationRoutes.get("/logo", getDefaultOrganisationLogo);

organisationRoutes.get("/", authenticate, getAllOrganisations);

organisationRoutes.get(
  "/:id",
  authenticate,
  authorize(["SuperAdmin"]),
  getOrganisationById,
);

// Route de création avec gestion d'erreurs Multer
organisationRoutes.post(
  "/",
  upload.single("logo"),
  handleMulterError, // Middleware d'erreur
  createOrganisation,
);

// Route de mise à jour avec gestion d'erreurs Multer
organisationRoutes.put(
  "/:id",
  authenticate,
  authorize(["SuperAdmin"]),
  upload.single("logo"),
  handleMulterError, // Middleware d'erreur
  updateOrganisation,
);

organisationRoutes.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin"]),
  deleteOrganisation,
);

export default organisationRoutes;
