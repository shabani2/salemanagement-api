import dotenv from "dotenv";

dotenv.config();

/**
 * Database configuration based on the environment.
 */
const getDatabaseUri = (): string => {
  const env = process.env.NODE_ENV;

  switch (env) {
    case "production":
      return (
        process.env.MONGO_URI_PRODUCTION ||
        throwMissingEnv("MONGO_URI_PRODUCTION")
      );
    case "development":
      return (
        process.env.MONGO_URI_DEVELOPMENT ||
        throwMissingEnv("MONGO_URI_DEVELOPMENT")
      );
    default:
      return process.env.MONGO_URI_LOCAL || throwMissingEnv("MONGO_URI_LOCAL");
  }
};

/**
 * Throw an error if environment variable is missing.
 */
const throwMissingEnv = (key: string): never => {
  throw new Error(`Missing environment variable: ${key}`);
};

export const config = {
  databaseUri: getDatabaseUri(),
  nodeEnv: process.env.NODE_ENV || "development",
};
