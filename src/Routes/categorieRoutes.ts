import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createCategorie,
  deleteCategorie,
  getAllCategories,
  getCategorieById,
} from "../Controllers/categorieController";
import { upload } from "../Middlewares/upload";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  getAllCategories,
);
router.post(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  upload.single("image"),
  createCategorie,
);
router.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  deleteCategorie,
);
router.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  getCategorieById,
);

export default router;
