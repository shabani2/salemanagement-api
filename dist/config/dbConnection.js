"use strict";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
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
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config/config");
/**
 * Connect to MongoDB using the URI from configuration.
 */
const connectDB = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      console.log(`Connecting to MongoDB (${config_1.config.nodeEnv})...`);
      yield mongoose_1.default.connect(config_1.config.databaseUri);
      console.log("Connection established successfully");
    } catch (error) {
      console.error({
        error: error.message || "An unknown error occurred",
      });
      process.exit(1);
    }
  });
exports.connectDB = connectDB;
