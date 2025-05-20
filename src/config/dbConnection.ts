// import mongoose from "mongoose";
// import dotenv from "dotenv";

// dotenv.config({ path: "../../.env" });

// //console.log("ENV VARIABLES:", process.env)

// export const connectDB = async () => {
//   try {
//     console.log("connection var = " + process.env.MONGO_URI);
//     await mongoose.connect(process.env.MONGO_URI as string);
//     console.log("connection establish successfully");
//   } catch (error) {
//     console.log({
//       error: (error as Error).message || "An unknown error occurred",
//     });
//     process.exit(1);
//   }
// };

// import mongoose from "mongoose";

// /**
//  * Connect to MongoDB based on the current environment.
//  */
// export const connectDB = async () => {
//   try {
//     const env = process.env.NODE_ENV;

//     let dbURI: string | undefined;

//     switch (env) {
//       case 'production':
//         dbURI = process.env.MONGO_URI_PROD;
//         break;
//       case 'test':
//         dbURI = process.env.MONGO_URI_TEST;
//         break;
//       default:
//         dbURI = process.env.MONGO_URI_LOCAL;
//         break;
//     }

//     if (!dbURI) {
//       throw new Error(`Database URI not defined for environment: ${env}`);
//     }

//     console.log(`Connecting to MongoDB (${env})...`);
//     await mongoose.connect(dbURI);
//     console.log("Connection established successfully");
//   } catch (error) {
//     console.error({
//       error: (error as Error).message || "An unknown error occurred",
//     });
//     process.exit(1);
//   }
// };

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
