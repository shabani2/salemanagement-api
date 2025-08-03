"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialSettings =
  exports.Discount =
  exports.DiscountType =
  exports.ExchangeRate =
  exports.Currency =
    void 0;
// src/models/exchangeRate.model.ts
const mongoose_1 = __importStar(require("mongoose"));
const CurrencySchema = new mongoose_1.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    isBase: { type: Boolean, default: false },
  },
  { timestamps: true },
);
exports.Currency = mongoose_1.default.model("Currency", CurrencySchema);
const ExchangeRateSchema = new mongoose_1.Schema(
  {
    baseCurrency: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    targetCurrency: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Currency",
      required: true,
    },
    rate: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    expirationDate: { type: Date },
  },
  { timestamps: true },
);
exports.ExchangeRate = mongoose_1.default.model(
  "ExchangeRate",
  ExchangeRateSchema,
);
var DiscountType;
(function (DiscountType) {
  DiscountType["PERCENTAGE"] = "PERCENTAGE";
  DiscountType["FIXED_AMOUNT"] = "FIXED_AMOUNT";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
const DiscountSchema = new mongoose_1.Schema(
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
    targetIds: [{ type: mongoose_1.Schema.Types.ObjectId }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
exports.Discount = mongoose_1.default.model("Discount", DiscountSchema);
const FinancialSettingsSchema = new mongoose_1.Schema(
  {
    defaultCurrency: {
      type: mongoose_1.Schema.Types.ObjectId,
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
exports.FinancialSettings = mongoose_1.default.model(
  "FinancialSettings",
  FinancialSettingsSchema,
);
