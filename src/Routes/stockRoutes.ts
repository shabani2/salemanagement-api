import express from "express";
import { Request, Response } from "express";

import {
  getAllStocks,
  getStockById,
  createStock,
  updateStock,
  deleteStock,
  //checkStock,
  checkStockHandler,
  getStocksByPointVente,
  getStocksByRegion,
} from "../Controllers/stockController";
import { authenticate } from "../Middlewares/auth";

const stockRouter = express.Router();

// 🔹 GET /stocks - Liste tous les stocks
stockRouter.get("/",authenticate, getAllStocks);


// 🔹 GET /stocks/:id - Obtenir un stock par ID
stockRouter.get("/:id",authenticate, getStockById);
stockRouter.get(
  "/region/:regionId",
  authenticate,
  getStocksByRegion,
);
stockRouter.get("/stock-by-pv/:pointVenteId",authenticate, getStocksByPointVente);



// 🔹 POST /stocks - Créer un nouveau stock
stockRouter.post("/",authenticate, createStock);

// 🔹 PUT /stocks/:id - Mettre à jour un stock
stockRouter.put("/:id",authenticate, updateStock);

// 🔹 DELETE /stocks/:id - Supprimer un stock
stockRouter.delete("/:id",authenticate, deleteStock);

stockRouter.post("/check",authenticate, checkStockHandler);

export default stockRouter;
