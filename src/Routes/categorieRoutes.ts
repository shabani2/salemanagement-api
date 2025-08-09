import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createCategorie,
  deleteCategorie,
  getAllCategories,
  // getCategorieById,
  updateCategorie,
} from "../Controllers/categorieController";
import { upload } from "../Middlewares/upload";

const router = express.Router();

router.get(
  "/",
  authenticate,
  // authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  getAllCategories,
);
// router.get(
//   "/:id",
//   authenticate,
//   authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
//   upload.single("image"),
//    getCategorieById
//  ,
// );
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
router.put(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  upload.single("image"),
  updateCategorie,
);

export default router;
