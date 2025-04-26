// src/routes/pdfGeneratorRouter.ts
import { Router } from "express";
import { generateStockPdf } from "../Controllers/pdfGenerator";

const pdfRouter = Router();

// Route: POST /api/pdf/stock
pdfRouter.post("/", generateStockPdf);

export default pdfRouter;
