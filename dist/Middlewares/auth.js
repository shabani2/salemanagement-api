"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_1 = require("../Utils/jwt");
const authenticate = (req, res, next) => {
    var _a;
    const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    console.log("token : ", token);
    if (!token) {
        res.status(401).json({ message: "Accès refusé, token manquant" });
        return; // 🔹 Assure que la fonction retourne bien `void`
    }
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        req.user = decoded;
        next(); // 🔹 Correct, car il retourne bien `void`
    }
    catch (err) {
        res.status(403).json({ message: "Token invalide" });
        return; // 🔹 Ajouté pour éviter l'erreur de type
    }
};
exports.authenticate = authenticate;
