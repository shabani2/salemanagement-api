"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const commandeController_1 = require("../Controllers/commandeController");
const commandeRouter = express_1.default.Router();
commandeRouter.get("/", auth_1.authenticate, commandeController_1.getAllCommandes);
commandeRouter.get("/:id", auth_1.authenticate, commandeController_1.getCommandeById);
commandeRouter.get("/by-user/:userId", auth_1.authenticate, commandeController_1.getCommandesByUser);
commandeRouter.get("/by-pointvente/:pointVenteId", auth_1.authenticate, commandeController_1.getCommandesByPointVente);
commandeRouter.get("/by-region/:regionId", auth_1.authenticate, commandeController_1.getCommandesByRegion);
commandeRouter.post("/", auth_1.authenticate, commandeController_1.createCommande);
commandeRouter.put("/:id", auth_1.authenticate, commandeController_1.updateCommande);
commandeRouter.delete("/:id", auth_1.authenticate, commandeController_1.deleteCommande);
exports.default = commandeRouter;
