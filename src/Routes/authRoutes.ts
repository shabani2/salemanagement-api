import express from "express";
import { forgotPassword, login, logout, register, resetPassword, verifyEmail } from "../Controllers/authController";
import { upload } from "../Middlewares/upload";

const AuthRoutes = express.Router();

//router.post('/register', register);
//ts-ignore
AuthRoutes.post("/login", login);
AuthRoutes.post("/logout", logout);
AuthRoutes.get("/verify-email", verifyEmail);
AuthRoutes.post("/login", login);
AuthRoutes.post("/forgot-password", forgotPassword);
AuthRoutes.post("/reset-password", resetPassword);

AuthRoutes.post("/register", upload.single("image"), register);

export default AuthRoutes;
