"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const authorize_1 = require("../Middlewares/authorize");
const regionController_1 = require("../Controllers/regionController");
const router = express_1.default.Router();
// Middlewares communs (optionnel: tu peux aussi les mettre route par route)
// router.use(authenticate, authorize(["SuperAdmin", "AdminRegion"]));
/**
 * IMPORTANT:
 * - /search DOIT être défini avant "/:id" pour éviter que "search" soit pris comme :id
 */
// Liste paginée / filtrée / triée
router.get("/", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), regionController_1.getAllRegions);
// Recherche paginée (mêmes query params)
router.get("/search", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), regionController_1.searchRegions);
// Détail par ID (GET, pas DELETE)
router.get("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), regionController_1.getRegionById);
// Création
router.post("/", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), regionController_1.createRegion);
// Mise à jour
router.put("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), regionController_1.updateRegion);
// Suppression
router.delete("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), regionController_1.deleteRegion);
exports.default = router;
