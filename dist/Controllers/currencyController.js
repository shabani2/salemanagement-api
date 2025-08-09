"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFinancialSettings = exports.getFinancialSettings = exports.validateDiscountCode = exports.createDiscount = exports.getAllDiscounts = exports.getExchangeRate = exports.createExchangeRate = exports.getAllExchangeRates = exports.getBaseCurrency = exports.deleteCurrency = exports.updateCurrency = exports.createCurrency = exports.getAllCurrencies = void 0;
const CurrencyModel_1 = require("../Models/CurrencyModel");
const getAllCurrencies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currencies = yield CurrencyModel_1.Currency.find();
        res.json(currencies);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllCurrencies = getAllCurrencies;
const createCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currency = new CurrencyModel_1.Currency(req.body);
        yield currency.save();
        res.status(201).json(currency);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createCurrency = createCurrency;
const updateCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updated = yield CurrencyModel_1.Currency.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updated) {
            res.status(404).json({ message: "Devise non trouvée" });
            return;
        }
        res.json(updated);
    }
    catch (err) {
        res
            .status(400)
            .json({ message: "Erreur lors de la mise à jour", error: err.message });
    }
});
exports.updateCurrency = updateCurrency;
const deleteCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield CurrencyModel_1.Currency.findByIdAndDelete(id);
        res.json({ message: "Devise supprimée avec succès" });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.deleteCurrency = deleteCurrency;
const getBaseCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const baseCurrency = yield CurrencyModel_1.Currency.findOne({ isBase: true });
        if (!baseCurrency) {
            res.status(404).json({ message: "Aucune devise de base configurée" });
            return;
        }
        res.json(baseCurrency);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getBaseCurrency = getBaseCurrency;
const getAllExchangeRates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rates = yield CurrencyModel_1.ExchangeRate.find()
            .populate("baseCurrency", "code name symbol")
            .populate("targetCurrency", "code name symbol");
        res.json(rates);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllExchangeRates = getAllExchangeRates;
const createExchangeRate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { baseCurrency, targetCurrency } = req.body;
        // Vérifier si la paire existe déjà
        const existingRate = yield CurrencyModel_1.ExchangeRate.findOne({
            baseCurrency,
            targetCurrency,
        });
        if (existingRate) {
            return res.status(400).json({
                message: "Un taux existe déjà pour cette paire de devises",
            });
        }
        const exchangeRate = new CurrencyModel_1.ExchangeRate(req.body);
        yield exchangeRate.save();
        res.status(201).json(exchangeRate);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createExchangeRate = createExchangeRate;
const getExchangeRate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { baseId, targetId } = req.params;
        const rate = yield CurrencyModel_1.ExchangeRate.findOne({
            baseCurrency: baseId,
            targetCurrency: targetId,
            expirationDate: { $gt: new Date() },
        })
            .sort({ effectiveDate: -1 })
            .limit(1);
        if (!rate) {
            res.status(404).json({
                message: "Taux de change non trouvé",
            });
            return;
        }
        res.json(rate);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getExchangeRate = getExchangeRate;
const getAllDiscounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, active } = req.query;
        const filter = {};
        if (type)
            filter.type = type;
        if (active)
            filter.isActive = active === "true";
        const discounts = yield CurrencyModel_1.Discount.find(filter);
        res.json(discounts);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllDiscounts = getAllDiscounts;
const createDiscount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const discount = new CurrencyModel_1.Discount(req.body);
        yield discount.save();
        res.status(201).json(discount);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createDiscount = createDiscount;
const validateDiscountCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.params;
        const discount = yield CurrencyModel_1.Discount.findOne({
            code,
            isActive: true,
            startDate: { $lte: new Date() },
            $or: [{ endDate: { $gte: new Date() } }, { endDate: { $exists: false } }],
        });
        if (!discount) {
            res.status(404).json({
                valid: false,
                message: "Code de réduction invalide ou expiré",
            });
            return;
        }
        res.json({ valid: true, discount });
        return;
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.validateDiscountCode = validateDiscountCode;
const getFinancialSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let settings = yield CurrencyModel_1.FinancialSettings.findOne();
        if (!settings) {
            // Create default settings if none exist
            settings = new CurrencyModel_1.FinancialSettings({
                defaultCurrency: null,
                taxRate: 20,
                loyaltyPointsRatio: 1,
                invoiceDueDays: 30,
                latePaymentFee: 0,
            });
            yield settings.save();
        }
        res.json(settings);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getFinancialSettings = getFinancialSettings;
const updateFinancialSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updated = yield CurrencyModel_1.FinancialSettings.findOneAndUpdate({}, req.body, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        res.json(updated);
    }
    catch (err) {
        res
            .status(400)
            .json({ message: "Erreur lors de la mise à jour", error: err.message });
    }
});
exports.updateFinancialSettings = updateFinancialSettings;
