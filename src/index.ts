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

dotenv.config();
const app = express();

// 🔹 Liste des domaines autorisés
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://www.agrecavente.online",
  "http://localhost:8080",
  "https://inaf-vente.netlify.app",
];

// 🔹 Options CORS
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
};

// 🔥 CORS doit être activé avant TOUTES les routes
app.use(cors(corsOptions));

// 🛠 Middleware JSON (après CORS)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
//app.listen(Port, () => console.log(`🚀 Server is running on port ${Port}`));
app.use(morgan("dev"));
console.log("🚀 Express app initialisée");

export default app;
