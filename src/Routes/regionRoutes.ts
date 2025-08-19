import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createRegion,
  deleteRegion,
  getAllRegions,
  getRegionById,
  updateRegion,
  searchRegions, // 👈 ajoute l'import
} from "../Controllers/regionController";

const router = express.Router();

// Middlewares communs (optionnel: tu peux aussi les mettre route par route)
// router.use(authenticate, authorize(["SuperAdmin", "AdminRegion"]));

/**
 * IMPORTANT:
 * - /search DOIT être défini avant "/:id" pour éviter que "search" soit pris comme :id
 */

// Liste paginée / filtrée / triée
router.get(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  getAllRegions,
);

// Recherche paginée (mêmes query params)
router.get(
  "/search",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  searchRegions,
);

// Détail par ID (GET, pas DELETE)
router.get(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  getRegionById,
);

// Création
router.post(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  createRegion,
);

// Mise à jour
router.put(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  updateRegion,
);

// Suppression
router.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  deleteRegion,
);

export default router;
