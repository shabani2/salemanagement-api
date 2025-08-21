"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const authorize = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        res.status(403).json({ message: "Accès interdit" });
        return; // Ajout d'un return explicite pour éviter l'erreur de type
    }
    return next(); // Ajout d'un return pour assurer un type `void`
};
exports.authorize = authorize;
