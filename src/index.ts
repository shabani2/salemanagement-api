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

app.use(cors(corsOptions));      // 👉 CORS doit venir AVANT
app.options("*", cors(corsOptions));

// 🛠 Middleware JSON (après CORS)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// 🔥 Vérifier que les requêtes OPTIONS passent bien
app.options("*", cors(corsOptions)); // Autoriser les préflight requests

// Connexion à MongoDB
connectDB();

// Routes statiques pour les images des catégories
app.use(
  "/assets/categorie",
  express.static(path.join(__dirname, "assets/categorie")),
);
app.use(
  "/assets/SuperAdmin",
  express.static(path.join(__dirname, "assets/SuperAdmin")),
);
app.use(
  "/assets/AdminRegion",
  express.static(path.join(__dirname, "assets/AdminRegion")),
);
app.use(
  "/assets/AdminPointVente",
  express.static(path.join(__dirname, "assets/AdminPointVente")),
);

app.use(
  "/assets/Vendeur",
  express.static(path.join(__dirname, "assets/Vendeur")),
);
app.use(
  "/assets/Client",
  express.static(path.join(__dirname, "assets/Client")),
);
app.use(
  "/assets/Logisticien",
  express.static(path.join(__dirname, "assets/Logisticien")),
);
app.use(
  "/assets/organisations",
  express.static(path.join(__dirname, "assets/organisations")),
);

// Routes principales
app.use("/auth", AuthRoutes);
app.use("/user", usersRouter);
app.use("/categories", categorieRoutes);
app.use("/produits", produitRoutes);

app.use("/organisations", organisationRoutes);
app.use("/region", regionRoutes);
app.use("/point-ventes", pointVenteRoutes);
app.use("/mouvementStock", mouvementStockRoute);
app.use("/stock", stockRouter);
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
