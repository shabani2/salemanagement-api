"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.financialSettingsRouter = exports.discountRouter = exports.exchangeRateRouter = exports.currencyRouter = void 0;
// src/routes/currency.routes.ts
const express_1 = __importDefault(require("express"));
const currencyController_1 = require("../Controllers/currencyController");
const currencyRouter = express_1.default.Router();
exports.currencyRouter = currencyRouter;
currencyRouter.get("/", currencyController_1.getAllCurrencies);
currencyRouter.get("/base", currencyController_1.getBaseCurrency);
currencyRouter.post("/", currencyController_1.createCurrency);
const exchangeRateRouter = express_1.default.Router();
exports.exchangeRateRouter = exchangeRateRouter;
exchangeRateRouter.get("/", currencyController_1.getAllExchangeRates);
exchangeRateRouter.get("/:baseId/:targetId", currencyController_1.getExchangeRate);
const discountRouter = express_1.default.Router();
exports.discountRouter = discountRouter;
discountRouter.get("/", currencyController_1.getAllDiscounts);
discountRouter.post("/", currencyController_1.createDiscount);
discountRouter.get("/validate/:code", currencyController_1.validateDiscountCode);
const financialSettingsRouter = express_1.default.Router();
exports.financialSettingsRouter = financialSettingsRouter;
financialSettingsRouter.get("/", currencyController_1.getFinancialSettings);
financialSettingsRouter.put("/", currencyController_1.updateFinancialSettings);
