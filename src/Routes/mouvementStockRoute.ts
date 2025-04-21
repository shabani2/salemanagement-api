import express from "express";
import {
  getAllMouvementsStock,
  getMouvementStockById,
  createMouvementStock,
  updateMouvementStock,
  deleteMouvementStock,
} from "../Controllers/mouvementStockController";
import { authenticate } from "../Middlewares/auth";

const mvtStockrouter = express.Router();

mvtStockrouter.get("/", authenticate, getAllMouvementsStock);
mvtStockrouter.get("/:id", authenticate, getMouvementStockById);
mvtStockrouter.post("/", authenticate, createMouvementStock);
mvtStockrouter.put("/:id", authenticate, updateMouvementStock);
mvtStockrouter.delete("/:id", authenticate, deleteMouvementStock);

export default mvtStockrouter;
