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
  deleteCommande
} from "../Controllers/commandeController";

const commandeRouter = express.Router();



commandeRouter.get("/", authenticate, getAllCommandes);
commandeRouter.get("/:id", authenticate, getCommandeById);
commandeRouter.get("/by-user/:userId", authenticate, getCommandesByUser);
commandeRouter.get("/by-pointvente/:pointVenteId", authenticate, getCommandesByPointVente);
commandeRouter.get("/by-region/:regionId", authenticate, getCommandesByRegion);

commandeRouter.post("/", authenticate, createCommande);
commandeRouter.put("/:id", authenticate, updateCommande);
commandeRouter.delete("/:id", authenticate, deleteCommande);

export default commandeRouter;
