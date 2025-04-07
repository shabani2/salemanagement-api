import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createPointVente,
  deletePointVente,
  getAllPointVentes,
  updatePointVente,
} from "../Controllers/pointVenteController";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  getAllPointVentes,
);
router.post(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  createPointVente,
);
router.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  deletePointVente,
);
router.put(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  updatePointVente,
);

export default router;
