"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stockController_1 = require("../Controllers/stockController");
const auth_1 = require("../Middlewares/auth");
const stockRouter = express_1.default.Router();
// 🔹 GET /stocks - Liste tous les stocks
stockRouter.get("/", auth_1.authenticate, stockController_1.getAllStocks);
// 🔹 GET /stocks/:id - Obtenir un stock par ID
stockRouter.get("/:id", auth_1.authenticate, stockController_1.getStockById);
stockRouter.get("/region/:regionId", auth_1.authenticate, stockController_1.getStocksByRegion);
stockRouter.get("/point-vente/:pointVenteId", auth_1.authenticate, stockController_1.getStocksByPointVente);
// 🔹 POST /stocks - Créer un nouveau stock
stockRouter.post("/", auth_1.authenticate, stockController_1.createStock);
// 🔹 PUT /stocks/:id - Mettre à jour un stock
stockRouter.put("/:id", auth_1.authenticate, stockController_1.updateStock);
// 🔹 DELETE /stocks/:id - Supprimer un stock
stockRouter.delete("/:id", auth_1.authenticate, stockController_1.deleteStock);
stockRouter.post("/check", auth_1.authenticate, stockController_1.checkStockHandler);
exports.default = stockRouter;
