import express from "express";
import { authenticate } from "../Middlewares/auth";
import {
  getAllCommandes,
  getCommandeById,
  getCommandesByUser,
  getCommandesByPointVente,
  getCommandesByRegion,
  createCommande,
  updateCommande,
  deleteCommande,
} from "../Controllers/commandeController";

const commandeRouter = express.Router();

/** ⚠️ Ordre important: on met les “by-*” AVANT "/:id" */
commandeRouter.get("/by-user/:userId", authenticate, getCommandesByUser);
commandeRouter.get("/by-point-vente/:pointVenteId", authenticate, getCommandesByPointVente);
commandeRouter.get("/by-region/:regionId", authenticate, getCommandesByRegion);

/** Liste paginée/triée (q, page, limit, sortBy, order) */
commandeRouter.get("/", authenticate, getAllCommandes);

/** Détail */
commandeRouter.get("/:id", authenticate, getCommandeById);

/** CRUD */
commandeRouter.post("/", authenticate, createCommande);
commandeRouter.put("/:id", authenticate, updateCommande);
commandeRouter.delete("/:id", authenticate, deleteCommande);

export default commandeRouter;