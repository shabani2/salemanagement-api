import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createProduit,
  deleteProduit,
  getAllProduits,
  getProduitById,
  updateProduit,
} from "../Controllers/produitController";
import { upload } from "../Middlewares/upload";
import { updatePointVente } from "../Controllers/pointVenteController";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  getAllProduits,
);
router.post(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  upload.single("image"),
  createProduit,
);
router.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  deleteProduit,
);
router.get(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  getProduitById,
);
router.put(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  updateProduit,
);

export default router;
