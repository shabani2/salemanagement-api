// routes/stockRoutes.ts
import express from "express";
import {
  getAllStocks,
  getStockById,
  createStock,
  updateStock,
  deleteStock,
  checkStockHandler,
} from "../Controllers/stockController";
import { authenticate } from "../Middlewares/auth";

const stockRouter = express.Router();

/**
 * GET /stocks
 * Exemples:
 *  - /stocks?page=1&limit=10
 *  - /stocks?q=riz
 *  - /stocks?region=<id>
 *  - /stocks?pointVente=<id>
 *  - /stocks?produit=<id>
 *  - /stocks?depotCentral=true
 *  - /stocks?sortBy=produit.nom&order=asc
 */
stockRouter.get("/", authenticate, getAllStocks);

// Attention: garder les routes « littérales » (ex: /check) AVANT toute route paramétrée si elles partagent la même méthode HTTP.
// Ici /check est un POST donc pas d’ambiguïté, mais on le met quand même au-dessus pour clarté.
stockRouter.post("/check", authenticate, checkStockHandler);

// Détail par id — placé après les routes littérales
stockRouter.get("/:id", authenticate, getStockById);

// CRUD
stockRouter.post("/", authenticate, createStock);
stockRouter.put("/:id", authenticate, updateStock);
stockRouter.delete("/:id", authenticate, deleteStock);

export default stockRouter;
