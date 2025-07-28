// src/models/exchangeRate.model.ts
import mongoose, { Schema } from "mongoose";

export interface ICurrency {
  code: string; // EUR, USD, CDF
  name: string;
  symbol: string;
  isBase: boolean;
}

const CurrencySchema = new Schema<ICurrency>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    isBase: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Currency = mongoose.model<ICurrency>("Currency", CurrencySchema);

export interface IExchangeRate {
  baseCurrency: mongoose.Types.ObjectId;
  targetCurrency: mongoose.Types.ObjectId;
  rate: number;
  effectiveDate: Date;
  expirationDate?: Date;
}

const ExchangeRateSchema = new Schema<IExchangeRate>(
  {
    baseCurrency: {
      type: Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    targetCurrency: {
      type: Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    rate: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    expirationDate: { type: Date },
  },
  { timestamps: true },
);

export const ExchangeRate = mongoose.model<IExchangeRate>(
  "ExchangeRate",
  ExchangeRateSchema,
);

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED_AMOUNT = "FIXED_AMOUNT",
}

export interface IDiscount {
  name: string;
  code: string;
  type: DiscountType;
  value: number;
  startDate: Date;
  endDate?: Date;
  maxAmount?: number;
  minPurchase?: number;
  appliesTo: "ALL" | "CATEGORY" | "PRODUCT";
  targetIds?: mongoose.Types.ObjectId[];
  isActive: boolean;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
    },
    value: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    maxAmount: { type: Number },
    minPurchase: { type: Number },
    appliesTo: {
      type: String,
      enum: ["ALL", "CATEGORY", "PRODUCT"],
      default: "ALL",
    },
    targetIds: [{ type: Schema.Types.ObjectId }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Discount = mongoose.model<IDiscount>("Discount", DiscountSchema);

export interface IFinancialSettings {
  defaultCurrency: mongoose.Types.ObjectId;
  taxRate: number;
  loyaltyPointsRatio: number;
  invoiceDueDays: number;
  latePaymentFee: number;
}

const FinancialSettingsSchema = new Schema<IFinancialSettings>(
  {
    defaultCurrency: {
      type: Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    taxRate: { type: Number, required: true },
    loyaltyPointsRatio: { type: Number, required: true },
    invoiceDueDays: { type: Number, required: true },
    latePaymentFee: { type: Number, required: true },
  },
  { timestamps: true },
);

// Singleton pattern for financial settings
FinancialSettingsSchema.index({}, { unique: true });

export const FinancialSettings = mongoose.model<IFinancialSettings>(
  "FinancialSettings",
  FinancialSettingsSchema,
);
