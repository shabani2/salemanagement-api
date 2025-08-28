import { errorHandler, notFound } from "./Middlewares/errorHandler";
import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { connectDB } from "./config/dbConnection";
import AuthRoutes from "./Routes/authRoutes";
import usersRouter from "./Routes/userRoutes";
import categorieRoutes from "./Routes/categorieRoutes";
import produitRoutes from "./Routes/produitRoutes";
import morgan from "morgan";
import regionRoutes from "./Routes/regionRoutes";
import pointVenteRoutes from "./Routes/pointVenteRoutes";
import path from "path";
import fs from "fs";
import { Produit } from "./Models/model";
import mouvementStockRoute from "./Routes/mouvementStockRoute";
import stockRouter from "./Routes/stockRoutes";
import organisationRoutes from "./Routes/organisationRoutes";
import pdfRouter from "./Routes/pdfRouter";
import exportRouter from "./Routes/exportRouter";
import {
  currencyRouter,
  discountRouter,
  exchangeRateRouter,
  financialSettingsRouter,
} from "./Routes/FinanceRoutes";
import commandeProduitRouter from "./Routes/commandeProduitRoutes";
import commandeRouter from "./Routes/commandeRoutes";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: "*", // 👉 Autorise toutes les origines
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  }),
);
app.options("*", cors());

// 🛠 Middleware JSON (après CORS)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// 🔥 Vérifier que les requêtes OPTIONS passent bien
//app.options("*", cors(corsOptions)); // Autoriser les préflight requests

// Connexion à MongoDB
connectDB();

//fonction statique pour exposer les fichier

const ASSETS_SRC = path.resolve(process.cwd(), "src/assets");
const ASSETS_ROOT = path.resolve(process.cwd(), "assets");

function mountDualStatic(prefix: string, subdir: string) {
  const fromSrc = path.join(ASSETS_SRC, subdir);
  const fromRoot = path.join(ASSETS_ROOT, subdir);

  // Essaye d'abord src/assets/<subdir>, puis fallback vers assets/<subdir>
  app.use(prefix, express.static(fromSrc, { fallthrough: true }));
  app.use(prefix, express.static(fromRoot));
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
app.use("/auth", AuthRoutes);
app.use("/user", usersRouter);
app.use("/categories", categorieRoutes);
app.use("/produits", produitRoutes);

app.use("/organisations", organisationRoutes);
app.use("/regions", regionRoutes);
app.use("/pointventes", pointVenteRoutes);
app.use("/mouvements", mouvementStockRoute);
app.use("/stocks", stockRouter);
app.use("/generatePdf", pdfRouter);

// Finance routes
app.use("/finance/currencies", currencyRouter);
app.use("/finance/exchange-rates", exchangeRateRouter);
app.use("/finance/discounts", discountRouter);
app.use("/finance/settings", financialSettingsRouter);

//routes pour les commandes
app.use("/commandes", commandeRouter);
app.use("/commande-produits", commandeProduitRouter);
// routes pour les exports
app.use("/export", exportRouter);

app.get("/", (_req, res) => {
  res.send("Bienvenue sur notre API de la gestion de vente");
});

// Test CORS directement
app.get("/test-cors", (req, res) => {
  res.json({ message: "CORS fonctionne bien !" });
});

// Gestion des erreurs
app.use(notFound);
app.use(errorHandler);
//Produit.collection.dropIndex("numeroSerie_1");
// Produit.collection.dropIndex("codeBar_1");

// 🔥 Lancement du serveur
const Port = process.env.PORT || 8000;
app.listen(Port, () => console.log(`🚀 Server is running on port ${Port}`));
app.use(morgan("dev"));
console.log("🚀 Express app initialisée");

export default app;
