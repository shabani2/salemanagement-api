"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const exportController_1 = require("../Controllers/exportDocument/exportController");
const exportRouter = express_1.default.Router();
exportRouter.post("/rapport-mouvement-stock", auth_1.authenticate, 
// authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
exportController_1.exportMouvementStockHandler);
//export route for stock
exportRouter.post("/stock", auth_1.authenticate, 
// authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
exportController_1.exportStockHandler);
//export router for user
exportRouter.post("/users", auth_1.authenticate, 
// authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
exportController_1.exportUserHandler);
exportRouter.post("/produits", auth_1.authenticate, 
// authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
exportController_1.exportProduitHandler);
exportRouter.post("/categories", auth_1.authenticate, 
// authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
exportController_1.exportCategorieHandler);
exportRouter.post("/point-ventes", auth_1.authenticate, 
// authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
exportController_1.exportPointVenteHandler);
exportRouter.post("/regions", auth_1.authenticate, 
// authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
exportController_1.exportRegionHandler);
exports.default = exportRouter;
