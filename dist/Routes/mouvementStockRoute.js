"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const mouvementStockController_1 = require("../Controllers/mouvementStockController");
const mouvementStockRoute = express_1.default.Router();
mouvementStockRoute.get("/", auth_1.authenticate, mouvementStockController_1.listMouvementsStock);
mouvementStockRoute.get("/:id", auth_1.authenticate, mouvementStockController_1.getMouvementById);
mouvementStockRoute.post("/", auth_1.authenticate, mouvementStockController_1.createMouvementStock);
mouvementStockRoute.put("/:id", auth_1.authenticate, mouvementStockController_1.updateMouvementStock);
mouvementStockRoute.delete("/:id", auth_1.authenticate, mouvementStockController_1.deleteMouvementStock);
mouvementStockRoute.patch("/:id/validate", auth_1.authenticate, mouvementStockController_1.validateMouvementStock);
exports.default = mouvementStockRoute;
