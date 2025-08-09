"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const authorize_1 = require("../Middlewares/authorize");
const pointVenteController_1 = require("../Controllers/pointVenteController");
const pointVenteRoutes = express_1.default.Router();
pointVenteRoutes.get("/", auth_1.authenticate, 
// authorize(["SuperAdmin", "AdminRegion"]),
pointVenteController_1.getAllPointVentes);
pointVenteRoutes.post("/", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), pointVenteController_1.createPointVente);
pointVenteRoutes.get("/region/:regionId", auth_1.authenticate, pointVenteController_1.getPointVentesByRegion);
pointVenteRoutes.delete("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), pointVenteController_1.deletePointVente);
pointVenteRoutes.get("/:id", auth_1.authenticate, pointVenteController_1.getPointVenteById);
pointVenteRoutes.put("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]), pointVenteController_1.updatePointVente);
exports.default = pointVenteRoutes;
