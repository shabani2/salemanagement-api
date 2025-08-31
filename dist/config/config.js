"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Database configuration based on the environment.
 */
const getDatabaseUri = () => {
    const env = process.env.NODE_ENV;
    switch (env) {
        case "production":
            return (process.env.MONGO_URI_PRODUCTION ||
                throwMissingEnv("MONGO_URI_PRODUCTION"));
        case "development":
            return (process.env.MONGO_URI_DEVELOPMENT ||
                throwMissingEnv("MONGO_URI_DEVELOPMENT"));
        default:
            return process.env.MONGO_URI_LOCAL || throwMissingEnv("MONGO_URI_LOCAL");
    }
};
/**
 * Throw an error if environment variable is missing.
 */
const throwMissingEnv = (key) => {
    throw new Error(`Missing environment variable: ${key}`);
};
exports.config = {
    databaseUri: getDatabaseUri(),
    nodeEnv: process.env.NODE_ENV || "development",
};
