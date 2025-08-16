"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const commandeProduitController_1 = require("../Controllers/commandeProduitController");
const commandeProduitRouter = express_1.default.Router();
/** ⚠️ Ordre: chemins spécifiques d’abord */
commandeProduitRouter.get("/by-user/:userId", auth_1.authenticate, commandeProduitController_1.getCommandeProduitsByUser);
commandeProduitRouter.get("/by-point-vente/:pointVenteId", auth_1.authenticate, commandeProduitController_1.getCommandeProduitsByPointVente);
commandeProduitRouter.get("/by-region/:regionId", auth_1.authenticate, commandeProduitController_1.getCommandeProduitsByRegion);
/** Détail d’une commande (commande + produits) */
commandeProduitRouter.get("/:commandeId", auth_1.authenticate, commandeProduitController_1.getCommandeById);
/** Mettre à jour UNE ligne de commande */
commandeProduitRouter.put("/ligne/:id", auth_1.authenticate, commandeProduitController_1.updateCommandeProduit);
exports.default = commandeProduitRouter;
