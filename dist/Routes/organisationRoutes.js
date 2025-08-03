"use strict";
// routes/organisationRoutes.ts
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const organisationController_1 = require("../Controllers/organisationController");
const auth_1 = require("../Middlewares/auth");
const authorize_1 = require("../Middlewares/authorize");
const organisationRoutes = express_1.default.Router();
// 📁 Configuration Multer pour upload de logo
const storage = multer_1.default.diskStorage({
  destination: path_1.default.join(__dirname, "../tmp"),
  filename: (req, file, cb) => {
    const ext = path_1.default.extname(file.originalname);
    const name = `${Date.now()}_${file.fieldname}${ext}`;
    cb(null, name);
  },
});
const upload = (0, multer_1.default)({ storage });
organisationRoutes.get(
  "/logo",
  organisationController_1.getDefaultOrganisationLogo,
);
organisationRoutes.get(
  "/",
  auth_1.authenticate,
  // authorize(["SuperAdmin"]),
  organisationController_1.getAllOrganisations,
);
organisationRoutes.post(
  "/",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin"]),
  upload.single("logo"),
  organisationController_1.createOrganisation,
);
organisationRoutes.get(
  "/:id",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin"]),
  organisationController_1.getOrganisationById,
);
organisationRoutes.put(
  "/:id",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin"]),
  organisationController_1.updateOrganisation,
);
organisationRoutes.delete(
  "/:id",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin"]),
  organisationController_1.deleteOrganisation,
);
exports.default = organisationRoutes;
