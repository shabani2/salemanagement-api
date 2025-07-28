import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createRegion,
  deleteRegion,
  getAllRegions,
  getRegionById,
  updateRegion,
} from "../Controllers/regionController";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  getAllRegions,
);
router.post(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  createRegion,
);
router.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  deleteRegion,
);
router.put(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  updateRegion,
);
router.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  getRegionById,
);

export default router;
