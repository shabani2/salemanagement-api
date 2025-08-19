// routes/pointVenteRoutes.ts
import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createPointVente,
  deletePointVente,
  getAllPointVentes,
  getPointVenteById,
  getPointVentesByRegion,
  updatePointVente,
  searchPointVentes, // 👈 importe la recherche
} from "../Controllers/pointVenteController";

const router = express.Router();

/**
 * IMPORTANT :
 * - Déclare /search et /by-region AVANT "/:id" pour éviter que "search" ou "by-region"
 *   soient pris pour un :id.
 */

// Liste paginée / triée / filtrée
router.get(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  getAllPointVentes,
);

// Recherche paginée (mêmes query params)
router.get(
  "/search",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  searchPointVentes,
);

// Listing par région (compat + même pagination/tri via querystring)
router.get(
  "/by-region/:regionId",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  getPointVentesByRegion,
);

// Détail
router.get(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  getPointVenteById,
);

// Création
router.post(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  createPointVente,
);

// Mise à jour
router.put(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  updatePointVente,
);

// Suppression (cascade + fallback gérés côté controller)
router.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  deletePointVente,
);

export default router;
