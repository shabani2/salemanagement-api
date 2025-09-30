

// ===============================================
// file: src/server/index.ts  (votre entrypoint ajusté)
// ===============================================
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "path";
import { connectDB } from "./config/dbConnection";
import { errorHandler, notFound } from "./Middlewares/errorHandler";
import AuthRoutes from "./Routes/authRoutes";
import usersRouter from "./Routes/userRoutes";
import categorieRoutes from "./Routes/categorieRoutes";
import produitRoutes from "./Routes/produitRoutes";
import regionRoutes from "./Routes/regionRoutes";
import pointVenteRoutes from "./Routes/pointVenteRoutes";
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
import { tenantInjector, requireTenant } from "./middlewares/tenant";

dotenv.config();
const app = express();

// derrière proxy (Heroku/Render/NGINX)
app.set("trust proxy", true);

app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  })
);
app.options("*", cors());

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use(morgan("dev"));

connectDB();

// static
const ASSETS_SRC = path.resolve(process.cwd(), "src/assets");
const ASSETS_ROOT = path.resolve(process.cwd(), "assets");
function mountDualStatic(prefix: string, subdir: string) {
  app.use(prefix, express.static(path.join(ASSETS_SRC, subdir), { fallthrough: true }));
  app.use(prefix, express.static(path.join(ASSETS_ROOT, subdir)));
}
mountDualStatic("/assets/categorie", "categorie");
mountDualStatic("/assets/SuperAdmin", "SuperAdmin");
mountDualStatic("/assets/AdminRegion", "AdminRegion");
mountDualStatic("/assets/AdminPointVente", "AdminPointVente");
mountDualStatic("/assets/Vendeur", "Vendeur");
mountDualStatic("/assets/Client", "Client");
mountDualStatic("/assets/Logisticien", "Logisticien");
mountDualStatic("/assets/organisations", "organisations");

// 🔑 IMPORTANT: injecter le tenant APRÈS auth (si vous attachez req.user en amont), sinon ici avant routes.
app.use(tenantInjector);

// --- Routes ---
// Pour login, on veut exiger un tenant (header slug ou subdomain) si req.user n'existe pas encore.
app.use("/auth", requireTenant(), AuthRoutes);

app.use("/user", usersRouter);
app.use("/categories", produitRoutes);
app.use("/produits", produitRoutes);
app.use("/organisations", organisationRoutes); // pas de tenant requis pour CRUD d'Organisation
app.use("/regions", regionRoutes);
app.use("/pointventes", pointVenteRoutes);
app.use("/mouvements", mouvementStockRoute);
app.use("/stocks", stockRouter);
app.use("/generatePdf", pdfRouter);
app.use("/finance/currencies", currencyRouter);
app.use("/finance/exchange-rates", exchangeRateRouter);
app.use("/finance/discounts", discountRouter);
app.use("/finance/settings", financialSettingsRouter);
app.use("/commandes", requireTenant(), /* si nécessaire */ exportRouter); // exemple si vous voulez forcer

app.get("/", (_req, res) => res.send("Bienvenue sur notre API de la gestion de vente"));
app.get("/test-cors", (_req, res) => res.json({ message: "CORS fonctionne bien !" }));

app.use(notFound);
app.use(errorHandler);

const Port = process.env.PORT || 8000;
app.listen(Port, () => console.log(`Server is running on port ${Port}`));
export default app;