// import mongoose from "mongoose";
// import dotenv from "dotenv";

// dotenv.config();

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI as string);
//     console.log("MongoDB Connected...");
//   } catch (error) {
//     console.error("MongoDB connection error:", error);
//     process.exit(1);
//   }
// };

// export default connectDB;

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

//console.log("ENV VARIABLES:", process.env)

export const connectDB = async () => {
  try {
    console.log("connection var = " + process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("connection establish successfully");
  } catch (error) {
    console.log({
      error: (error as Error).message || "An unknown error occurred",
    });
    process.exit(1);
  }
};
