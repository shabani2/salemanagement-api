"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/stockRoutes.ts
const express_1 = __importDefault(require("express"));
const stockController_1 = require("../Controllers/stockController");
const auth_1 = require("../Middlewares/auth");
const stockRouter = express_1.default.Router();
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
stockRouter.get("/", auth_1.authenticate, stockController_1.getAllStocks);
// Attention: garder les routes « littérales » (ex: /check) AVANT toute route paramétrée si elles partagent la même méthode HTTP.
// Ici /check est un POST donc pas d’ambiguïté, mais on le met quand même au-dessus pour clarté.
stockRouter.post("/check", auth_1.authenticate, stockController_1.checkStockHandler);
// Détail par id — placé après les routes littérales
stockRouter.get("/:id", auth_1.authenticate, stockController_1.getStockById);
// CRUD
stockRouter.post("/", auth_1.authenticate, stockController_1.createStock);
stockRouter.put("/:id", auth_1.authenticate, stockController_1.updateStock);
stockRouter.delete("/:id", auth_1.authenticate, stockController_1.deleteStock);
exports.default = stockRouter;
