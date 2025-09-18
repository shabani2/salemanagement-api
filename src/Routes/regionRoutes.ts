import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createRegion,
  deleteRegion,
  getAllRegions,
  getRegionById,
  searchRegions,
  updateRegion,
} from "../Controllers/regionController"; ///regions/search

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  getAllRegions,
);
router.get(
  "/search",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  searchRegions,
);
router.get("/:id", authenticate, getRegionById);
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
