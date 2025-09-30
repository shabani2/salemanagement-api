// models.ts
import mongoose, { Schema, Document , HydratedDocument } from "mongoose";

import { USER_ROLES, UserRole } from "../Utils/constant";
import {
  ICategorie,
  ICommande,
  ICommandeProduit,
  ILivraison,
  IMouvementStock,
  IOrganisation,
  IPointVente,
  IProduit,
  IRegion,
  IStock,
  IUser,
  
} from "./interfaceModels";
import bcrypt from "bcryptjs";
import {
  
  attachMouvementHooks,
 
} from "../Middlewares/operationHandler";

export type UserRoleType = (typeof UserRole)[number];

export type { UserDoc };


declare global {
  namespace Express {
    interface Request {
      /** Pourquoi: exposer l'utilisateur authentifié au reste de la stack */
      user?: HydratedDocument<IUser>;
    }
  }
}
export {};

type UserDoc = HydratedDocument<IUser>;

const UserSchema = new Schema<IUser>(
  {
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    telephone: { type: String, required: true, unique: true },
   // email: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    adresse: { type: String, required: true },
    password: { type: String }, // pas requis à la création
    role: { type: String, enum: USER_ROLES, required: true },
    image: { type: String },
    pointVente: { type: Schema.Types.ObjectId, ref: "PointVente" },
    region: { type: Schema.Types.ObjectId, ref: "Region" },
    firstConnection: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    emailVerifyTokenHash: { type: String, default: null },
    emailVerifyTokenExpires: { type: Date, default: null },
    resetPasswordTokenHash: { type: String, default: null },
    resetPasswordTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

const CategorieSchema = new Schema<ICategorie>(
  {
    nom: { type: String, required: true },
    type: { type: String, required: true },
    image: { type: String },
  },
  { timestamps: true },
);

const ProduitSchema = new Schema<IProduit>(
  {
    nom: { type: String, required: true },
    categorie: {
      type: Schema.Types.ObjectId,
      ref: "Categorie",
      required: true,
    },
    prix: { type: Number, required: true },
    prixVente: { type: Number, required: true },
    tva: { type: Number, required: true },
    marge: { type: Number, required: false },
    seuil: { type: Number, required: true },
    netTopay: { type: Number, required: false },
    unite: { type: String, required: false },
  },
  { timestamps: true },
);

const PointVenteSchema = new Schema<IPointVente>(
  {
    nom: { type: String, required: true },
    adresse: { type: String, required: true },
    region: {
      type: Schema.Types.ObjectId,
      ref: "Region",
      required: true,
    },
    stock: [
      {
        produit: {
          type: Schema.Types.ObjectId,
          ref: "Produit",
          required: true,
        },
        quantite: { type: Number, required: true, default: 0 },
      },
    ],
  },
  { timestamps: true },
);

const RegionSchema = new Schema<IRegion>(
  {
    nom: { type: String, required: true },
    ville: { type: String, required: true },
  },
  { timestamps: true },
);

const StockSchema = new Schema<IStock>(
  {
    produit: { type: Schema.Types.ObjectId, ref: "Produit", required: true },
    quantite: { type: Number, required: true, default: 0 },
    montant: { type: Number, required: true, default: 0 },
    pointVente: { type: Schema.Types.ObjectId, ref: "PointVente" },
    region: { type: Schema.Types.ObjectId, ref: "Region" },
    depotCentral: { type: Boolean, default: false },
  },
  { timestamps: true },
);

CategorieSchema.pre("findOneAndDelete", async function (next) {
  try {
    const categorie = this.getQuery()._id;
    await Produit.deleteMany({ categorie });
    next();
  } catch (err) {
    next(err as mongoose.CallbackError);
  }
});

const MouvementStockSchema = new Schema<IMouvementStock>(
  {
    pointVente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PointVente",
      required: false,
    },
    commandeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commande",
      default: null,
    },
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region",
      required: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    depotCentral: { type: Boolean, default: false },
    produit: { type: Schema.Types.ObjectId, ref: "Produit", required: true },
    type: {
      type: String,
      enum: ["Entrée", "Sortie", "Vente", "Livraison", "Commande"],
      required: true,
    },
    quantite: { type: Number, required: true },
    montant: { type: Number, required: true },
    statut: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// PRE-SAVE VALIDATION
attachMouvementHooks(MouvementStockSchema); 



// --- Ton hook existant: OK pour new/save et user.save() ---
UserSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();

    const passwordToHash = (this as any).password as string | undefined;
    if (!passwordToHash) {
      return next(new Error("Password field is missing or empty."));
    }

    (this as any).password = await bcrypt.hash(passwordToHash, 10);
    next();
  } catch (err) {
    next(err as mongoose.CallbackError);
  }
});

// --- Utils: détecter un hash bcrypt pour éviter double-hash ---
function looksHashed(value: unknown): boolean {
  return typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
}

// --- Centraliser le hash pour les middlewares de requête ---
async function hashPasswordInUpdate(update: any) {
  // Mot de passe possible dans update.password, update.$set.password, ou update.$setOnInsert.password
  const containers = [update, update?.$set, update?.$setOnInsert];

  for (const c of containers) {
    if (!c || typeof c !== "object") continue;
    if (!("password" in c)) continue;

    const pwd = c.password;
    if (!pwd) {
      throw new Error("Password field is missing or empty.");
    }
    if (looksHashed(pwd)) {
      // On suppose déjà hashé -> ne rien faire
      continue;
    }
    c.password = await bcrypt.hash(String(pwd), 10);
  }
}

// --- Hooks de requête: couvrent findOneAndUpdate / findByIdAndUpdate / updateOne ---
UserSchema.pre("findOneAndUpdate", async function (next) {
  try {
    // @ts-ignore – getUpdate existe sur Query
    const update = this.getUpdate();
    if (update) await hashPasswordInUpdate(update);
    next();
  } catch (err) {
    next(err as mongoose.CallbackError);
  }
});

UserSchema.pre("updateOne", async function (next) {
  try {
    // @ts-ignore
    const update = this.getUpdate();
    if (update) await hashPasswordInUpdate(update);
    next();
  } catch (err) {
    next(err as mongoose.CallbackError);
  }
});

// (optionnel) si vous utilisez updateMany quelque part
UserSchema.pre("updateMany", async function (next) {
  try {
    // @ts-ignore
    const update = this.getUpdate();
    if (update) await hashPasswordInUpdate(update);
    next();
  } catch (err) {
    next(err as mongoose.CallbackError);
  }
});

UserSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.bumpTokenVersion = async function () {
  // Invalide tous les JWT existants (payload.ver)
  this.tokenVersion += 1;
  await this.save();
};


export const User = mongoose.model<IUser>("User", UserSchema);

export const Categorie = mongoose.model<ICategorie>(
  "Categorie",
  CategorieSchema,
);
export const Produit = mongoose.model<IProduit>("Produit", ProduitSchema);
export const PointVente = mongoose.model<IPointVente>(
  "PointVente",
  PointVenteSchema,
);
export const Region = mongoose.model<IRegion>("Region", RegionSchema);

export const Stock = mongoose.model<IStock>("Stock", StockSchema);

export const MouvementStock = mongoose.model<IMouvementStock>(
  "MouvementStock",
  MouvementStockSchema,
);

const OrganisationSchema = new Schema<IOrganisation>(
  {
    nom: { type: String, required: true },
    idNat: { type: String, required: true },
    contact: { type: String, required: true },
    numeroImpot: { type: String, required: true },
    logo: { type: String },
    devise: { type: String, required: true },
    superAdmin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pays: { type: String, required: true },
    emailEntreprise: { type: String, required: true },
  },
  { timestamps: true },
);

export const Organisations = mongoose.model<IOrganisation>(
  "Organisation",
  OrganisationSchema,
);

export const CommandeProduitSchema = new Schema<ICommandeProduit>(
  {
    commandeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commande",
      required: true,
    },
    produit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Produit",
      required: true,
    },
    quantite: {
      type: Number,
      required: true,
    },
    statut: {
      type: String,
      enum: ["attente", "livré", "annulé"],
      default: "attente",
    },
    mouvementStockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MouvementStock",
      default: null,
    },
  },
  { timestamps: true },
);

export const CommandeProduit = mongoose.model<ICommandeProduit>(
  "CommandeProduit",
  CommandeProduitSchema,
);

export const CommandeSchema = new Schema<ICommande>(
  {
    numero: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fournisseur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region",
    },
    pointVente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PointVente",
    },
    requestedRegion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region",
    },
    requestedPointVente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PointVente",
    },
    depotCentral: {
      type: Boolean,
      default: false,
    },
    produits: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommandeProduit",
      },
    ],
    statut: {
      type: String,
      enum: ["attente", "livrée", "annulée"],
      default: "attente",
    },
  },
  { timestamps: true },
);

export const Commande = mongoose.model<ICommande>("Commande", CommandeSchema);