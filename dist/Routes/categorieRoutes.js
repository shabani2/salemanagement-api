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
const categorieController_1 = require("../Controllers/categorieController");
const upload_1 = require("../Middlewares/upload");
const router = express_1.default.Router();
router.get(
  "/",
  auth_1.authenticate,
  // authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  categorieController_1.getAllCategories,
);
// router.get(
//   "/:id",
//   authenticate,
//   authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
//   upload.single("image"),
//    getCategorieById
//  ,
// );
router.post(
  "/",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  upload_1.upload.single("image"),
  categorieController_1.createCategorie,
);
router.delete(
  "/:id",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  categorieController_1.deleteCategorie,
);
router.put(
  "/:id",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  upload_1.upload.single("image"),
  categorieController_1.updateCategorie,
);
exports.default = router;
