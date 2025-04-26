// routes/organisationRoutes.ts

import express from "express";
import multer from "multer";
import path from "path";

import {
  createOrganisation,
  deleteOrganisation,
  getAllOrganisations,
  getOrganisationById,
  updateOrganisation,
} from "../Controllers/organisationController";

import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";

const organisationRoutes = express.Router();

// 📁 Configuration Multer pour upload de logo
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../tmp"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}_${file.fieldname}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

organisationRoutes.get(
  "/",
  authenticate,
  authorize(["SuperAdmin"]),
  getAllOrganisations,
);

organisationRoutes.post(
  "/",
  authenticate,
  authorize(["SuperAdmin"]),
  upload.single("logo"),
  createOrganisation,
);

organisationRoutes.get(
  "/:id",
  authenticate,
  authorize(["SuperAdmin"]),
  getOrganisationById,
);

organisationRoutes.put(
  "/:id",
  authenticate,
  authorize(["SuperAdmin"]),
  updateOrganisation,
);

organisationRoutes.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin"]),
  deleteOrganisation,
);

export default organisationRoutes;
