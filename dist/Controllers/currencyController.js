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
exports.updateFinancialSettings = exports.getFinancialSettings = exports.validateDiscountCode = exports.createDiscount = exports.getAllDiscounts = exports.getExchangeRate = exports.createExchangeRate = exports.getAllExchangeRates = exports.getBaseCurrency = exports.deleteCurrency = exports.updateCurrency = exports.createCurrency = exports.getCurrencyById = exports.searchCurrency = exports.getAllCurrencies = void 0;
const CurrencyModel_1 = require("../Models/CurrencyModel");
/* ============================================================================
 *                                 CURRENCIES
 * ==========================================================================*/
// 🔹 Obtenir toutes les devises (tri desc)
const getAllCurrencies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currencies = yield CurrencyModel_1.Currency.find().sort({ createdAt: -1 });
        res.json(currencies);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllCurrencies = getAllCurrencies;
// 🔹 Recherche devise par q (code | name | symbol)
const searchCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { q } = req.query;
    try {
        const re = typeof q === "string" && q.trim().length
            ? { $regex: q, $options: "i" }
            : undefined;
        const filter = re
            ? { $or: [{ code: re }, { name: re }, { symbol: re }] }
            : {};
        const currencies = yield CurrencyModel_1.Currency.find(filter).sort({ createdAt: -1 });
        res.json(currencies);
    }
    catch (err) {
        res
            .status(500)
            .json({ message: "Erreur lors de la recherche", error: err });
    }
});
exports.searchCurrency = searchCurrency;
// 🔹 Obtenir une devise par ID
const getCurrencyById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currency = yield CurrencyModel_1.Currency.findById(id);
        if (!currency) {
            res.status(404).json({ message: "Devise non trouvée" });
            return;
        }
        res.json(currency);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getCurrencyById = getCurrencyById;
// 🔹 Créer une devise
const createCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, name, symbol, isBase } = req.body;
        // Optionnel: éviter doublons de code
        const existing = yield CurrencyModel_1.Currency.findOne({ code });
        if (existing) {
            res.status(400).json({ message: "Une devise avec ce code existe déjà" });
            return;
        }
        if (isBase) {
            // Assurer unicité de la devise de base
            yield CurrencyModel_1.Currency.updateMany({ isBase: true }, { $set: { isBase: false } });
        }
        const currency = new CurrencyModel_1.Currency({ code, name, symbol, isBase: !!isBase });
        yield currency.save();
        res.status(201).json(currency);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createCurrency = createCurrency;
// 🔹 Mettre à jour une devise
const updateCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (updateData.isBase === true) {
            // Si on passe en base, retirer le flag ailleurs
            yield CurrencyModel_1.Currency.updateMany({ isBase: true }, { $set: { isBase: false } });
        }
        const updated = yield CurrencyModel_1.Currency.findByIdAndUpdate(id, updateData, {
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
            .json({
            message: "Erreur lors de la mise à jour",
            error: (_a = err.message) !== null && _a !== void 0 ? _a : err,
        });
    }
});
exports.updateCurrency = updateCurrency;
// 🔹 Supprimer une devise
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
// 🔹 Obtenir la devise de base
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
/* ============================================================================
 *                              EXCHANGE RATES
 * ==========================================================================*/
// 🔹 Obtenir tous les taux (filtres optionnels)
const getAllExchangeRates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { baseCurrency, targetCurrency, active } = req.query;
        const filter = {};
        if (baseCurrency)
            filter.baseCurrency = baseCurrency;
        if (targetCurrency)
            filter.targetCurrency = targetCurrency;
        // active = "true" => expirationDate > now
        if (active === "true")
            filter.expirationDate = { $gt: new Date() };
        const rates = yield CurrencyModel_1.ExchangeRate.find(filter)
            .sort({ effectiveDate: -1, createdAt: -1 })
            .populate("baseCurrency", "code name symbol")
            .populate("targetCurrency", "code name symbol");
        res.json(rates);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllExchangeRates = getAllExchangeRates;
// 🔹 Créer un taux de change
const createExchangeRate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { baseCurrency, targetCurrency, rate, effectiveDate, expirationDate, } = req.body;
        if (!baseCurrency || !targetCurrency || !rate) {
            res.status(400).json({ message: "Champs requis manquants" });
            return;
        }
        if (String(baseCurrency) === String(targetCurrency)) {
            res
                .status(400)
                .json({
                message: "La devise source et cible doivent être différentes",
            });
            return;
        }
        if (expirationDate &&
            effectiveDate &&
            new Date(expirationDate) <= new Date(effectiveDate)) {
            res
                .status(400)
                .json({
                message: "La date d'expiration doit être postérieure à la date d'effet",
            });
            return;
        }
        // Vérifier une paire active existante
        const existingRate = yield CurrencyModel_1.ExchangeRate.findOne({
            baseCurrency,
            targetCurrency,
            expirationDate: { $gt: new Date() },
        });
        if (existingRate) {
            res.status(400).json({
                message: "Un taux actif existe déjà pour cette paire de devises",
            });
            return;
        }
        const exchangeRate = new CurrencyModel_1.ExchangeRate({
            baseCurrency,
            targetCurrency,
            rate,
            effectiveDate,
            expirationDate,
        });
        yield exchangeRate.save();
        res.status(201).json(exchangeRate);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createExchangeRate = createExchangeRate;
// 🔹 Obtenir le dernier taux actif pour une paire
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
            res.status(404).json({ message: "Taux de change non trouvé" });
            return;
        }
        res.json(rate);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getExchangeRate = getExchangeRate;
/* ============================================================================
 *                                DISCOUNTS
 * ==========================================================================*/
// 🔹 Obtenir toutes les réductions (filtres: type, active)
const getAllDiscounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, active } = req.query;
        const filter = {};
        if (type)
            filter.type = type;
        if (active)
            filter.isActive = active === "true";
        const discounts = yield CurrencyModel_1.Discount.find(filter).sort({ createdAt: -1 });
        res.json(discounts);
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.getAllDiscounts = getAllDiscounts;
// 🔹 Créer une réduction
const createDiscount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.body;
        // Optionnel: unicité par code
        if (code) {
            const exists = yield CurrencyModel_1.Discount.findOne({ code });
            if (exists) {
                res
                    .status(400)
                    .json({ message: "Un code de réduction identique existe déjà" });
                return;
            }
        }
        const discount = new CurrencyModel_1.Discount(req.body);
        yield discount.save();
        res.status(201).json(discount);
    }
    catch (err) {
        res.status(400).json({ message: "Erreur lors de la création", error: err });
    }
});
exports.createDiscount = createDiscount;
// 🔹 Valider un code de réduction
const validateDiscountCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.params;
        const now = new Date();
        const discount = yield CurrencyModel_1.Discount.findOne({
            code,
            isActive: true,
            startDate: { $lte: now },
            $or: [{ endDate: { $gte: now } }, { endDate: { $exists: false } }],
        });
        if (!discount) {
            res.status(404).json({
                valid: false,
                message: "Code de réduction invalide ou expiré",
            });
            return;
        }
        res.json({ valid: true, discount });
    }
    catch (err) {
        res.status(500).json({ message: "Erreur interne", error: err });
    }
});
exports.validateDiscountCode = validateDiscountCode;
/* ============================================================================
 *                           FINANCIAL SETTINGS
 * ==========================================================================*/
// 🔹 Obtenir (ou créer par défaut) les paramètres financiers
const getFinancialSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let settings = yield CurrencyModel_1.FinancialSettings.findOne();
        if (!settings) {
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
// 🔹 Mettre à jour les paramètres financiers
const updateFinancialSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
            .json({
            message: "Erreur lors de la mise à jour",
            error: (_a = err.message) !== null && _a !== void 0 ? _a : err,
        });
    }
});
exports.updateFinancialSettings = updateFinancialSettings;
