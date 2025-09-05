"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../Controllers/authController");
const upload_1 = require("../Middlewares/upload");
const AuthRoutes = express_1.default.Router();
//router.post('/register', register);
//ts-ignore
AuthRoutes.post("/login", authController_1.login);
AuthRoutes.post("/logout", authController_1.logout);
AuthRoutes.post("/register", upload_1.upload.single("image"), authController_1.register);
exports.default = AuthRoutes;
