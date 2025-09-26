// file: src/utils/jwt.ts
import { sign, verify, type SignOptions, type Secret, JsonWebTokenError } from "jsonwebtoken";
import type { Types } from "mongoose";
import type { IUser } from "../Models/interfaceModels";

const JWT_SECRET: Secret = process.env.JWT_SECRET ?? "dev_only_secret_change_me";

/** Parse l'expiration depuis l'env, fallback "7d" si absent/invalid */
function parseExpiresIn(): SignOptions["expiresIn"] {
  const raw = process.env.JWT_EXPIRES_IN;
  if (!raw) return "7d";
  if (/^\d+$/.test(raw)) return Number(raw) as SignOptions["expiresIn"];
  return raw as unknown as SignOptions["expiresIn"];
}

export type AppJwtPayload = {
  sub: string;
  role: IUser["role"];
  ver: IUser["tokenVersion"];
};

type WithMongoId = { _id: string | Types.ObjectId };
type UserForToken = Pick<IUser, "role" | "tokenVersion"> & WithMongoId;

const toSubject = (id: string | Types.ObjectId): string =>
  typeof id === "string"
    ? id
    : typeof (id as any).toHexString === "function"
    ? (id as Types.ObjectId).toHexString()
    : String(id);

/** Génère un JWT (ajoute jwtid SEULEMENT si fourni) */
export function generateToken(
  user: UserForToken,
  opts?: { expiresIn?: SignOptions["expiresIn"]; jwtid?: string },
): string {
  const payload: AppJwtPayload = {
    sub: toSubject(user._id),
    role: user.role,
    ver: user.tokenVersion,
  };

  const options: SignOptions = {
    expiresIn: opts?.expiresIn ?? parseExpiresIn(),
  };
  if (typeof opts?.jwtid === "string" && opts.jwtid.length > 0) {
    options.jwtid = opts.jwtid; // important: ne pas passer undefined
  }

  return sign(payload, JWT_SECRET, options);
}

/** Vérifie un JWT et renvoie le payload typé */
export function verifyToken(token: string): AppJwtPayload {
  try {
    const decoded = verify(token, JWT_SECRET);
    if (typeof decoded !== "object" || !decoded) throw new Error("Invalid token payload");
    const { sub, role, ver } = decoded as Partial<AppJwtPayload>;
    if (!sub || !role || typeof ver !== "number") throw new Error("Malformed token payload");
    return { sub, role, ver };
  } catch (err) {
    if (err instanceof JsonWebTokenError) {
      throw new Error(`JWT error: ${err.message}`);
    }
    throw err;
  }
}
