import express from "express";
import { authenticate } from "../Middlewares/auth";
import {
  getCommandeProduitsByUser,
  getCommandeProduitsByPointVente,
  getCommandeProduitsByRegion,
  getCommandeById,            // détail d’une commande (commande + lignes)
  updateCommandeProduit,      // MAJ d’une ligne de commande
} from "../Controllers/commandeProduitController";

const commandeProduitRouter = express.Router();

/** ⚠️ Ordre: chemins spécifiques d’abord */
commandeProduitRouter.get("/by-user/:userId", authenticate, getCommandeProduitsByUser);
commandeProduitRouter.get("/by-point-vente/:pointVenteId", authenticate, getCommandeProduitsByPointVente);
commandeProduitRouter.get("/by-region/:regionId", authenticate, getCommandeProduitsByRegion);

/** Détail d’une commande (commande + produits) */
commandeProduitRouter.get("/:commandeId", authenticate, getCommandeById);

/** Mettre à jour UNE ligne de commande */
commandeProduitRouter.put("/ligne/:id", authenticate, updateCommandeProduit);

export default commandeProduitRouter;
