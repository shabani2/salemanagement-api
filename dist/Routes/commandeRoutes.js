"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const commandeController_1 = require("../Controllers/commandeController");
const commandeRouter = express_1.default.Router();
// List + filtres (requestedRegion, requestedPointVente, fournisseur, etc.)
commandeRouter.get(
  "/",
  auth_1.authenticate,
  commandeController_1.getAllCommandes,
);
// Scopes dédiés
commandeRouter.get(
  "/by-user/:userId",
  auth_1.authenticate,
  commandeController_1.getCommandesByUser,
);
commandeRouter.get(
  "/by-pointvente/:pointVenteId",
  auth_1.authenticate,
  commandeController_1.getCommandesByPointVente,
);
commandeRouter.get(
  "/by-region/:regionId",
  auth_1.authenticate,
  commandeController_1.getCommandesByRegion,
);
commandeRouter.get(
  "/by-requested-region/:requestedRegionId",
  auth_1.authenticate,
  commandeController_1.getCommandesByRequestedRegion,
);
commandeRouter.get(
  "/by-requested-point-vente/:requestedPointVenteId",
  auth_1.authenticate,
  commandeController_1.getCommandesByRequestedPointVente,
);
commandeRouter.get(
  "/by-fournisseur/:fournisseurId",
  auth_1.authenticate,
  commandeController_1.getCommandesByFournisseur,
);
// CRUD + print
commandeRouter.get(
  "/:id",
  auth_1.authenticate,
  commandeController_1.getCommandeById,
);
commandeRouter.get(
  "/:id/print",
  auth_1.authenticate,
  commandeController_1.printCommande,
);
commandeRouter.post(
  "/",
  auth_1.authenticate,
  commandeController_1.createCommande,
);
commandeRouter.put(
  "/:id",
  auth_1.authenticate,
  commandeController_1.updateCommande,
);
commandeRouter.delete(
  "/:id",
  auth_1.authenticate,
  commandeController_1.deleteCommande,
);
exports.default = commandeRouter;
