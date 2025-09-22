// import jwt from "jsonwebtoken";
// const JWT_SECRET = process.env.JWT_SECRET || "secret_key";

// export const generateToken = (userId: string, role: string) => {
//   return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
// };

// export const verifyToken = (token: string) => {
//   return jwt.verify(token, JWT_SECRET);
// };



// file: src/utils/jwt.ts
import jwt from "jsonwebtoken";
import { IUser } from "../Models/interfaceModels";


const JWT_SECRET = process.env.JWT_SECRET || "secret_key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

type JwtPayload = { sub: string; role: string; ver: number };

export const generateToken = (user: IUser) => {
  // Pourquoi: ver transporte tokenVersion pour invalidation côté middleware
  const payload: JwtPayload = { sub: user._id, role: user.role, ver: user.tokenVersion };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
