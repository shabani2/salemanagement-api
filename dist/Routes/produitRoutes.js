"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const authorize_1 = require("../Middlewares/authorize");
const produitController_1 = require("../Controllers/produitController");
const upload_1 = require("../Middlewares/upload");
const router = express_1.default.Router();
router.get("/", auth_1.authenticate, 
// authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
produitController_1.getAllProduits);
router.post("/", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion", "AdminPointVente"]), upload_1.upload.single("image"), produitController_1.createProduit);
router.delete("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion", "AdminPointVente"]), produitController_1.deleteProduit);
router.get("/search", auth_1.authenticate, produitController_1.searchProduit);
router.get("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion", "AdminPointVente"]), produitController_1.getProduitById);
router.put("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion", "AdminPointVente"]), produitController_1.updateProduit);
exports.default = router;
