import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createPointVente,
  deletePointVente,
  getAllPointVentes,
  getPointVentesByRegion,
  updatePointVente,
} from "../Controllers/pointVenteController";

const pointVenteRoutes = express.Router();

pointVenteRoutes.get(
  "/",
  authenticate,
  // authorize(["SuperAdmin", "AdminRegion"]),
  getAllPointVentes,
);
pointVenteRoutes.post(
  "/",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  createPointVente,
);
pointVenteRoutes.get(
  "/region/:regionId",
  authenticate,
  getPointVentesByRegion,
);
pointVenteRoutes.delete(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  deletePointVente,
);
pointVenteRoutes.put(
  "/:id",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  updatePointVente,
);

export default pointVenteRoutes;
