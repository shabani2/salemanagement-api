"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const organisationController_1 = require("../Controllers/organisationController");
const auth_1 = require("../Middlewares/auth");
const authorize_1 = require("../Middlewares/authorize");
const organisationRoutes = express_1.default.Router();
// Multer en mémoire uniquement (fichier buffer disponible dans req.file.buffer)
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        }
        else {
            cb(new Error("Seules les images sont autorisées!"));
        }
    },
});
// Middleware de gestion d'erreurs Multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError || err) {
        return res.status(400).json({ message: err.message });
    }
    next();
};
organisationRoutes.get("/logo", organisationController_1.getDefaultOrganisationLogo);
organisationRoutes.get("/", auth_1.authenticate, organisationController_1.getAllOrganisations);
organisationRoutes.get("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin"]), organisationController_1.getOrganisationById);
// Routes POST et PUT avec upload Multer en mémoire + gestion erreurs
organisationRoutes.post("/", upload.single("logo"), handleMulterError, organisationController_1.createOrganisation);
organisationRoutes.put("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin"]), upload.single("logo"), handleMulterError, organisationController_1.updateOrganisation);
organisationRoutes.delete("/:id", auth_1.authenticate, (0, authorize_1.authorize)(["SuperAdmin"]), organisationController_1.deleteOrganisation);
exports.default = organisationRoutes;
