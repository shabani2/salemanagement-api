import express from "express";
import multer from "multer";
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

// Multer en mémoire uniquement (fichier buffer disponible dans req.file.buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Seules les images sont autorisées!"));
    }
  },
});

// Middleware de gestion d'erreurs Multer
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ message: err.message });
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

// Routes POST et PUT avec upload Multer en mémoire + gestion erreurs
organisationRoutes.post(
  "/",
  upload.single("logo"),
  handleMulterError,
  createOrganisation,
);

organisationRoutes.put(
  "/:id",
  authenticate,
  authorize(["SuperAdmin"]),
  upload.single("logo"),
  handleMulterError,
  updateOrganisation,
);

organisationRoutes.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin"]),
  deleteOrganisation,
);

export default organisationRoutes;
