import express from "express";
import {
  getAllMouvementsStock,
  getMouvementStockById,
  createMouvementStock,
  updateMouvementStock,
  deleteMouvementStock,
  getMouvementsStockByPointVente,
  getMouvementStockByRegion,
  getMouvementsStockByUserId,
  getMouvementsStockAggregatedByUserId,
  getMouvementsStockAggregatedByPointVente,
  getMouvementsStockByPointVenteId,
} from "../Controllers/mouvementStockController";
import { authenticate } from "../Middlewares/auth";
import { validateState } from "../Controllers/mouvementStockController";

const mvtStockrouter = express.Router();

mvtStockrouter.get("/", authenticate, getAllMouvementsStock);
mvtStockrouter.get("/:id", authenticate, getMouvementStockById);
mvtStockrouter.get(
  "/by-point-vente/:pointVenteId",
  authenticate,
  getMouvementsStockByPointVente,
);
mvtStockrouter.get(
  "/by-point-vente/page/:pointVenteId",
  authenticate,
  getMouvementsStockByPointVenteId,
);
mvtStockrouter.get(
  "/by-point-vente/aggregate/:pointVenteId",
  authenticate,
  getMouvementsStockAggregatedByPointVente,
);
mvtStockrouter.get("/byUser/:userId", authenticate, getMouvementsStockByUserId);
mvtStockrouter.get(
  "/byUser/aggregate/:userId",
  authenticate,
  getMouvementsStockAggregatedByUserId,
);
mvtStockrouter.get(
  "/region/:regionId",
  authenticate,
  getMouvementStockByRegion,
);
mvtStockrouter.post("/", authenticate, createMouvementStock);
mvtStockrouter.put("/:id", authenticate, updateMouvementStock);
mvtStockrouter.delete("/:id", authenticate, deleteMouvementStock);
mvtStockrouter.put("/validate/:id", authenticate, validateState);

export default mvtStockrouter;
