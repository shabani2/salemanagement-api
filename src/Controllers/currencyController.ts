// src/controllers/currency.controller.ts
import { Request, Response } from "express";
import {
  Currency,
  Discount,
  ExchangeRate,
  FinancialSettings,
} from "../Models/CurrencyModel";

/* ============================================================================
 *                                 CURRENCIES
 * ==========================================================================*/

// 🔹 Obtenir toutes les devises (tri desc)
export const getAllCurrencies = async (req: Request, res: Response) => {
  try {
    const currencies = await Currency.find().sort({ createdAt: -1 });
    res.json(currencies);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Recherche devise par q (code | name | symbol)
export const searchCurrency = async (req: Request, res: Response) => {
  const { q } = req.query;

  try {
    const re =
      typeof q === "string" && q.trim().length
        ? { $regex: q, $options: "i" }
        : undefined;

    const filter: any = re
      ? { $or: [{ code: re }, { name: re }, { symbol: re }] }
      : {};

    const currencies = await Currency.find(filter).sort({ createdAt: -1 });
    res.json(currencies);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Erreur lors de la recherche", error: err });
  }
};

// 🔹 Obtenir une devise par ID
export const getCurrencyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currency = await Currency.findById(id);

    if (!currency) {
      res.status(404).json({ message: "Devise non trouvée" });
      return;
    }

    res.json(currency);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Créer une devise
export const createCurrency = async (req: Request, res: Response) => {
  try {
    const { code, name, symbol, isBase } = req.body;

    // Optionnel: éviter doublons de code
    const existing = await Currency.findOne({ code });
    if (existing) {
      res.status(400).json({ message: "Une devise avec ce code existe déjà" });
      return;
    }

    if (isBase) {
      // Assurer unicité de la devise de base
      await Currency.updateMany({ isBase: true }, { $set: { isBase: false } });
    }

    const currency = new Currency({ code, name, symbol, isBase: !!isBase });
    await currency.save();

    res.status(201).json(currency);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

// 🔹 Mettre à jour une devise
export const updateCurrency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updateData: Partial<{
      code: string;
      name: string;
      symbol: string;
      isBase: boolean;
    }> = req.body;

    if (updateData.isBase === true) {
      // Si on passe en base, retirer le flag ailleurs
      await Currency.updateMany({ isBase: true }, { $set: { isBase: false } });
    }

    const updated = await Currency.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      res.status(404).json({ message: "Devise non trouvée" });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la mise à jour",
        error: err.message ?? err,
      });
  }
};

// 🔹 Supprimer une devise
export const deleteCurrency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await Currency.findByIdAndDelete(id);
    res.json({ message: "Devise supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Obtenir la devise de base
export const getBaseCurrency = async (req: Request, res: Response) => {
  try {
    const baseCurrency = await Currency.findOne({ isBase: true });
    if (!baseCurrency) {
      res.status(404).json({ message: "Aucune devise de base configurée" });
      return;
    }
    res.json(baseCurrency);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/* ============================================================================
 *                              EXCHANGE RATES
 * ==========================================================================*/

// 🔹 Obtenir tous les taux (filtres optionnels)
export const getAllExchangeRates = async (req: Request, res: Response) => {
  try {
    const { baseCurrency, targetCurrency, active } = req.query;

    const filter: any = {};
    if (baseCurrency) filter.baseCurrency = baseCurrency;
    if (targetCurrency) filter.targetCurrency = targetCurrency;

    // active = "true" => expirationDate > now
    if (active === "true") filter.expirationDate = { $gt: new Date() };

    const rates = await ExchangeRate.find(filter)
      .sort({ effectiveDate: -1, createdAt: -1 })
      .populate("baseCurrency", "code name symbol")
      .populate("targetCurrency", "code name symbol");

    res.json(rates);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Créer un taux de change
export const createExchangeRate = async (req: Request, res: Response) => {
  try {
    const {
      baseCurrency,
      targetCurrency,
      rate,
      effectiveDate,
      expirationDate,
    } = req.body;

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
    if (
      expirationDate &&
      effectiveDate &&
      new Date(expirationDate) <= new Date(effectiveDate)
    ) {
      res
        .status(400)
        .json({
          message:
            "La date d'expiration doit être postérieure à la date d'effet",
        });
      return;
    }

    // Vérifier une paire active existante
    const existingRate = await ExchangeRate.findOne({
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

    const exchangeRate = new ExchangeRate({
      baseCurrency,
      targetCurrency,
      rate,
      effectiveDate,
      expirationDate,
    });
    await exchangeRate.save();

    res.status(201).json(exchangeRate);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

// 🔹 Obtenir le dernier taux actif pour une paire
export const getExchangeRate = async (req: Request, res: Response) => {
  try {
    const { baseId, targetId } = req.params;

    const rate = await ExchangeRate.findOne({
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
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/* ============================================================================
 *                                DISCOUNTS
 * ==========================================================================*/

// 🔹 Obtenir toutes les réductions (filtres: type, active)
export const getAllDiscounts = async (req: Request, res: Response) => {
  try {
    const { type, active } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (active) filter.isActive = active === "true";

    const discounts = await Discount.find(filter).sort({ createdAt: -1 });
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Créer une réduction
export const createDiscount = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    // Optionnel: unicité par code
    if (code) {
      const exists = await Discount.findOne({ code });
      if (exists) {
        res
          .status(400)
          .json({ message: "Un code de réduction identique existe déjà" });
        return;
      }
    }

    const discount = new Discount(req.body);
    await discount.save();
    res.status(201).json(discount);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

// 🔹 Valider un code de réduction
export const validateDiscountCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const now = new Date();

    const discount = await Discount.findOne({
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
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/* ============================================================================
 *                           FINANCIAL SETTINGS
 * ==========================================================================*/

// 🔹 Obtenir (ou créer par défaut) les paramètres financiers
export const getFinancialSettings = async (req: Request, res: Response) => {
  try {
    let settings = await FinancialSettings.findOne();

    if (!settings) {
      settings = new FinancialSettings({
        defaultCurrency: null,
        taxRate: 20,
        loyaltyPointsRatio: 1,
        invoiceDueDays: 30,
        latePaymentFee: 0,
      });
      await settings.save();
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Mettre à jour les paramètres financiers
export const updateFinancialSettings = async (req: Request, res: Response) => {
  try {
    const updated = await FinancialSettings.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (err: any) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la mise à jour",
        error: err.message ?? err,
      });
  }
};
