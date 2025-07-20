// src/controllers/currency.controller.ts
import { Request, Response } from "express";

import { Currency, Discount, ExchangeRate, FinancialSettings } from "../Models/CurrencyModel";

export const getAllCurrencies = async (req: Request, res: Response) => {
  try {
    const currencies = await Currency.find();
    res.json(currencies);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const createCurrency = async (req: Request, res: Response) => {
  try {
    const currency = new Currency(req.body);
    await currency.save();
    res.status(201).json(currency);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

export const updateCurrency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await Currency.findByIdAndUpdate(id, req.body, { 
      new: true,
      runValidators: true 
    });

    if (!updated) {
      res.status(404).json({ message: 'Devise non trouvée' });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour', error: err.message });
  }
};

export const deleteCurrency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Currency.findByIdAndDelete(id);
    res.json({ message: "Devise supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

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



export const getAllExchangeRates = async (req: Request, res: Response) => {
  try {
    const rates = await ExchangeRate.find()
      .populate('baseCurrency', 'code name symbol')
      .populate('targetCurrency', 'code name symbol');
      
    res.json(rates);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const createExchangeRate = async (req: Request, res: Response) => {
  try {
    const { baseCurrency, targetCurrency } = req.body;
    
    // Vérifier si la paire existe déjà
    const existingRate = await ExchangeRate.findOne({ 
      baseCurrency, 
      targetCurrency 
    });
    
    if (existingRate) {
      return res.status(400).json({ 
        message: "Un taux existe déjà pour cette paire de devises" 
      });
    }
    
    const exchangeRate = new ExchangeRate(req.body);
    await exchangeRate.save();
    
    res.status(201).json(exchangeRate);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

export const getExchangeRate = async (req: Request, res: Response) => {
  try {
    const { baseId, targetId } = req.params;
    
    const rate = await ExchangeRate.findOne({
      baseCurrency: baseId,
      targetCurrency: targetId,
      expirationDate: { $gt: new Date() }
    })
    .sort({ effectiveDate: -1 })
    .limit(1);
    
    if (!rate) {
      res.status(404).json({ 
        message: "Taux de change non trouvé" 
      });
      return;
    }
    
    res.json(rate);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};



export const getAllDiscounts = async (req: Request, res: Response) => {
  try {
    const { type, active } = req.query;
    
    const filter: any = {};
    if (type) filter.type = type;
    if (active) filter.isActive = active === 'true';
    
    const discounts = await Discount.find(filter);
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const createDiscount = async (req: Request, res: Response) => {
  try {
    const discount = new Discount(req.body);
    await discount.save();
    res.status(201).json(discount);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

export const validateDiscountCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const discount = await Discount.findOne({ 
      code, 
      isActive: true,
      startDate: { $lte: new Date() },
      $or: [
        { endDate: { $gte: new Date() } },
        { endDate: { $exists: false } }
      ]
    });
    
    if (!discount) {
       res.status(404).json({ 
        valid: false, 
        message: "Code de réduction invalide ou expiré" 
       });
        return;
    }
    
      res.json({ valid: true, discount });
      return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};


export const getFinancialSettings = async (req: Request, res: Response) => {
  try {
    let settings = await FinancialSettings.findOne();
    
    if (!settings) {
      // Create default settings if none exist
      settings = new FinancialSettings({
        defaultCurrency: null,
        taxRate: 20,
        loyaltyPointsRatio: 1,
        invoiceDueDays: 30,
        latePaymentFee: 0
      });
      await settings.save();
    }
    
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

export const updateFinancialSettings = async (req: Request, res: Response) => {
  try {
    const updated = await FinancialSettings.findOneAndUpdate({}, req.body, {
      new: true,
      upsert: true,
      runValidators: true
    });
    
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: 'Erreur lors de la mise à jour', error: err.message });
  }
};