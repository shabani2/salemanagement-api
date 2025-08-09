
import mongoose from "mongoose";
import { config } from "../config/config";

/**
 * Connect to MongoDB using the URI from configuration.
 */
export const connectDB = async () => {
  try {
    console.log(`Connecting to MongoDB (${config.nodeEnv})...`);
    await mongoose.connect(config.databaseUri);
    console.log("Connection established successfully");
  } catch (error) {
    console.error({
      error: (error as Error).message || "An unknown error occurred",
    });
    process.exit(1);
  }
};
