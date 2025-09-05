"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const errorHandler_1 = require("./Middlewares/errorHandler");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const dbConnection_1 = require("./config/dbConnection");
const authRoutes_1 = __importDefault(require("./Routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./Routes/userRoutes"));
const categorieRoutes_1 = __importDefault(require("./Routes/categorieRoutes"));
const produitRoutes_1 = __importDefault(require("./Routes/produitRoutes"));
const morgan_1 = __importDefault(require("morgan"));
const regionRoutes_1 = __importDefault(require("./Routes/regionRoutes"));
const pointVenteRoutes_1 = __importDefault(
  require("./Routes/pointVenteRoutes"),
);
const path_1 = __importDefault(require("path"));
const mouvementStockRoute_1 = __importDefault(
  require("./Routes/mouvementStockRoute"),
);
const stockRoutes_1 = __importDefault(require("./Routes/stockRoutes"));
const organisationRoutes_1 = __importDefault(
  require("./Routes/organisationRoutes"),
);
const pdfRouter_1 = __importDefault(require("./Routes/pdfRouter"));
const exportRouter_1 = __importDefault(require("./Routes/exportRouter"));
const FinanceRoutes_1 = require("./Routes/FinanceRoutes");
const commandeProduitRoutes_1 = __importDefault(
  require("./Routes/commandeProduitRoutes"),
);
const commandeRoutes_1 = __importDefault(require("./Routes/commandeRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(
  (0, cors_1.default)({
    origin: "*", // 👉 Autorise toutes les origines
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  }),
);
app.options("*", (0, cors_1.default)());
// 🛠 Middleware JSON (après CORS)
app.use(express_1.default.json({ limit: "20mb" }));
app.use(express_1.default.urlencoded({ limit: "20mb", extended: true }));
// 🔥 Vérifier que les requêtes OPTIONS passent bien
//app.options("*", cors(corsOptions)); // Autoriser les préflight requests
// Connexion à MongoDB
(0, dbConnection_1.connectDB)();
//fonction statique pour exposer les fichier
const ASSETS_SRC = path_1.default.resolve(process.cwd(), "src/assets");
const ASSETS_ROOT = path_1.default.resolve(process.cwd(), "assets");
function mountDualStatic(prefix, subdir) {
  const fromSrc = path_1.default.join(ASSETS_SRC, subdir);
  const fromRoot = path_1.default.join(ASSETS_ROOT, subdir);
  // Essaye d'abord src/assets/<subdir>, puis fallback vers assets/<subdir>
  app.use(prefix, express_1.default.static(fromSrc, { fallthrough: true }));
  app.use(prefix, express_1.default.static(fromRoot));
}
// Exemple d'utilisation
mountDualStatic("/assets/categorie", "categorie");
mountDualStatic("/assets/SuperAdmin", "SuperAdmin");
mountDualStatic("/assets/AdminRegion", "AdminRegion");
mountDualStatic("/assets/AdminPointVente", "AdminPointVente");
mountDualStatic("/assets/Vendeur", "Vendeur");
mountDualStatic("/assets/Client", "Client");
mountDualStatic("/assets/Logisticien", "Logisticien");
mountDualStatic("/assets/organisations", "organisations");
// Routes principales
app.use("/auth", authRoutes_1.default);
app.use("/user", userRoutes_1.default);
app.use("/categories", categorieRoutes_1.default);
app.use("/produits", produitRoutes_1.default);
app.use("/organisations", organisationRoutes_1.default);
app.use("/regions", regionRoutes_1.default);
app.use("/pointventes", pointVenteRoutes_1.default);
app.use("/mouvements", mouvementStockRoute_1.default);
app.use("/stocks", stockRoutes_1.default);
app.use("/generatePdf", pdfRouter_1.default);
// Finance routes
app.use("/finance/currencies", FinanceRoutes_1.currencyRouter);
app.use("/finance/exchange-rates", FinanceRoutes_1.exchangeRateRouter);
app.use("/finance/discounts", FinanceRoutes_1.discountRouter);
app.use("/finance/settings", FinanceRoutes_1.financialSettingsRouter);
//routes pour les commandes
app.use("/commandes", commandeRoutes_1.default);
app.use("/commande-produits", commandeProduitRoutes_1.default);
// routes pour les exports
app.use("/export", exportRouter_1.default);
app.get("/", (_req, res) => {
  res.send("Bienvenue sur notre API de la gestion de vente");
});
// Test CORS directement
app.get("/test-cors", (req, res) => {
  res.json({ message: "CORS fonctionne bien !" });
});
// Gestion des erreurs
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
//Produit.collection.dropIndex("numeroSerie_1");
// Produit.collection.dropIndex("codeBar_1");
// 🔥 Lancement du serveur
const Port = process.env.PORT || 8000;
app.listen(Port, () => console.log(`🚀 Server is running on port ${Port}`));
app.use((0, morgan_1.default)("dev"));
console.log("🚀 Express app initialisée");
exports.default = app;
