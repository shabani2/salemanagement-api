import express from "express";
import { authenticate } from "../Middlewares/auth";
import {
  getCommandeProduitsByUser,
  getCommandeProduitsByPointVente,
  getCommandeProduitsByRegion,
  getCommandeById,
  createCommande,
  updateCommande,
  deleteCommande,
} from "../Controllers/commandeProduitController";

const commandeProduitRouter = express.Router();

commandeProduitRouter.get(
  "/by-user/:userId",
  authenticate,
  getCommandeProduitsByUser,
);
commandeProduitRouter.get(
  "/by-pointvente/:pointVenteId",
  authenticate,
  getCommandeProduitsByPointVente,
);
commandeProduitRouter.get(
  "/by-region/:regionId",
  authenticate,
  getCommandeProduitsByRegion,
);
commandeProduitRouter.get("/:commandeId", authenticate, getCommandeById);

commandeProduitRouter.post("/", authenticate, createCommande);
commandeProduitRouter.put("/:commandeId", authenticate, updateCommande);
commandeProduitRouter.delete("/:commandeId", authenticate, deleteCommande);

export default commandeProduitRouter;
