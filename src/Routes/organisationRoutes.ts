import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createOrganisation,
  deleteOrganisation,
  getAllOrganisations,
  getOrganisationById,
} from "../Controllers/organisationController";
//import { getRegionById } from '../Controllers/regionController';

const router = express.Router();

router.get("/", authenticate, authorize(["SuperAdmin"]), getAllOrganisations);
router.post("/", authenticate, authorize(["SuperAdmin"]), createOrganisation);
router.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin"]),
  deleteOrganisation,
);
router.get(
  "/:id",
  authenticate,
  authorize(["SuperAdmin"]),
  getOrganisationById,
);

export default router;
