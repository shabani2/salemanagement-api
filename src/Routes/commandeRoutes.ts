import express from "express";
import { authenticate } from "../Middlewares/auth";
import {
  getAllCommandes,
  getCommandesByUser,
  getCommandesByPointVente,
  getCommandesByRegion,
  getCommandesByRequestedRegion,
  getCommandesByRequestedPointVente,
  getCommandesByFournisseur,
  getCommandeById,
  createCommande,
  updateCommande,
  deleteCommande,
  printCommande,
} from "../Controllers/commandeController";

const commandeRouter = express.Router();

// List + filtres (requestedRegion, requestedPointVente, fournisseur, etc.)
commandeRouter.get("/", authenticate, getAllCommandes);

// Scopes dédiés
commandeRouter.get("/by-user/:userId", authenticate, getCommandesByUser);
commandeRouter.get(
  "/by-pointvente/:pointVenteId",
  authenticate,
  getCommandesByPointVente,
);
commandeRouter.get("/by-region/:regionId", authenticate, getCommandesByRegion);
commandeRouter.get(
  "/by-requested-region/:requestedRegionId",
  authenticate,
  getCommandesByRequestedRegion,
);
commandeRouter.get(
  "/by-requested-point-vente/:requestedPointVenteId",
  authenticate,
  getCommandesByRequestedPointVente,
);
commandeRouter.get(
  "/by-fournisseur/:fournisseurId",
  authenticate,
  getCommandesByFournisseur,
);

// CRUD + print
commandeRouter.get("/:id", authenticate, getCommandeById);
commandeRouter.get("/:id/print", authenticate, printCommande);
commandeRouter.post("/", authenticate, createCommande);
commandeRouter.put("/:id", authenticate, updateCommande);
commandeRouter.delete("/:id", authenticate, deleteCommande);

export default commandeRouter;
