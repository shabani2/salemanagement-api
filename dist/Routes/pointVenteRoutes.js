"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/pointVenteRoutes.ts
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const authorize_1 = require("../Middlewares/authorize");
const pointVenteController_1 = require("../Controllers/pointVenteController");
const router = express_1.default.Router();
/**
 * IMPORTANT :
 * - Déclare /search et /by-region AVANT "/:id" pour éviter que "search" ou "by-region"
 *   soient pris pour un :id.
 */
// Liste paginée / triée / filtrée
router.get("/", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), pointVenteController_1.getAllPointVentes);
// Recherche paginée (mêmes query params)
router.get("/search", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), pointVenteController_1.searchPointVentes);
// Listing par région (compat + même pagination/tri via querystring)
router.get("/by-region/:regionId", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), pointVenteController_1.getPointVentesByRegion);
// Détail
router.get("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), pointVenteController_1.getPointVenteById);
// Création
router.post("/", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), pointVenteController_1.createPointVente);
// Mise à jour
router.put("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), pointVenteController_1.updatePointVente);
// Suppression (cascade + fallback gérés côté controller)
router.delete("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), pointVenteController_1.deletePointVente);
exports.default = router;
