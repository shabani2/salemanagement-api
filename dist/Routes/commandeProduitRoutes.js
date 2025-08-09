"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const commandeProduitController_1 = require("../Controllers/commandeProduitController");
const commandeProduitRouter = express_1.default.Router();
commandeProduitRouter.get("/by-user/:userId", auth_1.authenticate, commandeProduitController_1.getCommandeProduitsByUser);
commandeProduitRouter.get("/by-pointvente/:pointVenteId", auth_1.authenticate, commandeProduitController_1.getCommandeProduitsByPointVente);
commandeProduitRouter.get("/by-region/:regionId", auth_1.authenticate, commandeProduitController_1.getCommandeProduitsByRegion);
commandeProduitRouter.get("/:commandeId", auth_1.authenticate, commandeProduitController_1.getCommandeById);
commandeProduitRouter.post("/", auth_1.authenticate, commandeProduitController_1.createCommande);
//commandeProduitRouter.put("/:commandeId", authenticate, updateCommande);
commandeProduitRouter.delete("/:commandeId", auth_1.authenticate, commandeProduitController_1.deleteCommande);
exports.default = commandeProduitRouter;
