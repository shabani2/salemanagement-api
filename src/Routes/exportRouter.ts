import express from "express";
import { authenticate } from "../Middlewares/auth";

import {
  exportCategorieHandler,
  exportMouvementStockHandler,
  exportPointVenteHandler,
  exportProduitHandler,
  exportRegionHandler,
  exportStockHandler,
  exportUserHandler,
} from "../Controllers/exportDocument/exportController";

const exportRouter = express.Router();

exportRouter.post(
  "/rapport-mouvement-stock",
  authenticate,
  // authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  exportMouvementStockHandler,
);
//export route for stock
exportRouter.post(
  "/stock",
  authenticate,
  // authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  exportStockHandler,
);
//export router for user
exportRouter.post(
  "/users",
  authenticate,
  // authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  exportUserHandler,
);

exportRouter.post(
  "/produits",
  authenticate,
  // authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  exportProduitHandler,
);
exportRouter.post(
  "/categories",
  authenticate,
  // authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  exportCategorieHandler,
);

exportRouter.post(
  "/point-ventes",
  authenticate,
  // authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  exportPointVenteHandler,
);
exportRouter.post(
  "/regions",
  authenticate,
  // authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  exportRegionHandler,
);

export default exportRouter;
