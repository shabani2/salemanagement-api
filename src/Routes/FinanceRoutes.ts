// src/routes/currency.routes.ts
import express from 'express';
import { createCurrency, createDiscount, getAllCurrencies, getAllDiscounts, getAllExchangeRates, getBaseCurrency, getExchangeRate, getFinancialSettings, updateFinancialSettings, validateDiscountCode } from '../Controllers/currencyController';

;

const currencyRouter = express.Router();

currencyRouter.get('/', getAllCurrencies);
currencyRouter.get('/base', getBaseCurrency);
currencyRouter.post('/', createCurrency);
export { currencyRouter };


const exchangeRateRouter = express.Router();

exchangeRateRouter.get('/', getAllExchangeRates);
exchangeRateRouter.get('/:baseId/:targetId', getExchangeRate);
export { exchangeRateRouter };

const discountRouter = express.Router();

discountRouter.get('/', getAllDiscounts);
discountRouter.post('/', createDiscount);
discountRouter.get('/validate/:code', validateDiscountCode);
export { discountRouter };

const financialSettingsRouter = express.Router();

financialSettingsRouter.get('/', getFinancialSettings);
financialSettingsRouter.put('/', updateFinancialSettings);

export { financialSettingsRouter };