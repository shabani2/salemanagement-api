import express from "express";
import {
  getAllStocks,
  getStockById,
  createStock,
  updateStock,
  deleteStock,
} from "../Controllers/stockController";

const stockRouter = express.Router();

// 🔹 GET /stocks - Liste tous les stocks
stockRouter.get("/", getAllStocks);

// 🔹 GET /stocks/:id - Obtenir un stock par ID
stockRouter.get("/:id", getStockById);

// 🔹 POST /stocks - Créer un nouveau stock
stockRouter.post("/", createStock);

// 🔹 PUT /stocks/:id - Mettre à jour un stock
stockRouter.put("/:id", updateStock);

// 🔹 DELETE /stocks/:id - Supprimer un stock
stockRouter.delete("/:id", deleteStock);

export default stockRouter;
