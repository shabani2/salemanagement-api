"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/pdfGeneratorRouter.ts
const express_1 = require("express");
const pdfGenerator_1 = require("../Controllers/pdfGenerator");
const pdfRouter = (0, express_1.Router)();
// Route: POST /api/pdf/stock
pdfRouter.post("/", pdfGenerator_1.generateStockPdf);
exports.default = pdfRouter;
