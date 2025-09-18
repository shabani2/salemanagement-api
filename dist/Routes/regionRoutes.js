"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const authorize_1 = require("../Middlewares/authorize");
const regionController_1 = require("../Controllers/regionController"); ///regions/search
const router = express_1.default.Router();
router.get(
  "/",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]),
  regionController_1.getAllRegions,
);
router.get(
  "/search",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]),
  regionController_1.searchRegions,
);
router.get("/:id", auth_1.authenticate, regionController_1.getRegionById);
router.post(
  "/",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]),
  regionController_1.createRegion,
);
router.delete(
  "/:id",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]),
  regionController_1.deleteRegion,
);
router.put(
  "/:id",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]),
  regionController_1.updateRegion,
);
router.delete(
  "/:id",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]),
  regionController_1.getRegionById,
);
exports.default = router;
