import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createProduit,
  deleteProduit,
  getAllProduits,
  getProduitById,
} from "../Controllers/produitController";
import { upload } from "../Middlewares/upload";

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
router.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  getProduitById,
);

export default router;
