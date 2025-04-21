import express from "express";
import { login, logout, register } from "../Controllers/authController";
import { upload } from "../Middlewares/upload";

const AuthRoutes = express.Router();

//router.post('/register', register);
//ts-ignore
AuthRoutes.post("/login", login);
AuthRoutes.post("/logout", logout);

AuthRoutes.post("/register", upload.single("image"), register);

export default AuthRoutes;
