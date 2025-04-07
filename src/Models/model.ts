import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "../Utils/constant";
import {
  ICategorie,
  ICommande,
  ILivraison,
  IMouvementStock,
  IOrganisation,
  IPointVente,
  IProduit,
  IRegion,
  IUser,
  IVente,
} from "./interfaceModels";
import bcrypt from "bcryptjs";

export type UserRoleType = (typeof UserRole)[number];

const UserSchema = new Schema<IUser>(
  {
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    telephone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    adresse: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: UserRole, required: true },
    image: { type: String },
    pointVente: { type: Schema.Types.ObjectId, ref: "PointVente" },
    region: { type: Schema.Types.ObjectId, ref: "Region" },
  },
  { timestamps: true },
);

const OrganisationSchema = new Schema<IOrganisation>(
  {
    nom: { type: String, required: true },
    adresse: { type: String, required: true },
    telephone: { type: String, required: true },
    email: { type: String, required: true },
    logo: { type: String },
  },
  { timestamps: true },
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
    tva: { type: Number, required: true },
    numeroSerie: { type: String, required: true, unique: true },
    codeBar: { type: String, required: true, unique: true },
    // image: { type: String },
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

const VenteSchema = new Schema<IVente>(
  {
    vendeur: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pointVente: {
      type: Schema.Types.ObjectId,
      ref: "PointVente",
      required: true,
    },
    produits: [
      {
        produit: {
          type: Schema.Types.ObjectId,
          ref: "Produit",
          required: true,
        },
        quantite: { type: Number, required: true },
        prixTotal: { type: Number, required: true },
      },
    ],
    totalHT: { type: Number, required: true },
    totalTVA: { type: Number, required: true },
    totalTTC: { type: Number, required: true },
  },
  { timestamps: true },
);

const LivraisonSchema = new Schema<ILivraison>(
  {
    expediteur: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pointVente: {
      type: Schema.Types.ObjectId,
      ref: "PointVente",
      required: true,
    },
    produits: [
      {
        produit: {
          type: Schema.Types.ObjectId,
          ref: "Produit",
          required: true,
        },
        quantite: { type: Number, required: true },
      },
    ],
    statut: {
      type: String,
      enum: ["En Attente", "Validée"],
      default: "En Attente",
    },
  },
  { timestamps: true },
);

const CommandeSchema = new Schema<ICommande>(
  {
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },
    produits: [
      {
        produit: {
          type: Schema.Types.ObjectId,
          ref: "Produit",
          required: true,
        },
        quantite: { type: Number, required: true },
      },
    ],
    totalHT: { type: Number, required: true },
    totalTVA: { type: Number, required: true },
    totalTTC: { type: Number, required: true },
    statut: {
      type: String,
      enum: ["En Attente", "En Cours", "Livrée"],
      default: "En Attente",
    },
  },
  { timestamps: true },
);

const MouvementStockSchema = new Schema<IMouvementStock>(
  {
    pointVente: {
      type: Schema.Types.ObjectId,
      ref: "PointVente",
      required: true,
    },
    produit: { type: Schema.Types.ObjectId, ref: "Produit", required: true },
    type: { type: String, enum: ["Entrée", "Sortie"], required: true },
    quantite: { type: Number, required: true },
    reference: { type: Schema.Types.ObjectId, required: true },
    statut: {
      type: String,
      enum: ["En Attente", "Validée"],
      default: "En Attente",
    },
  },
  { timestamps: true },
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Comparer le mot de passe
UserSchema.methods.comparePassword = function (
  plainText: string,
): Promise<boolean> {
  return bcrypt.compare(plainText, this.password);
};

export const User = mongoose.model<IUser>("User", UserSchema);
export const Organisation = mongoose.model<IOrganisation>(
  "Organisation",
  OrganisationSchema,
);
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
export const Commande = mongoose.model<ICommande>("Commande", CommandeSchema);
export const MouvementStock = mongoose.model<IMouvementStock>(
  "MouvementStock",
  MouvementStockSchema,
);
export const Vente = mongoose.model<IVente>("Vente", VenteSchema);
export const Livraison = mongoose.model<ILivraison>(
  "Livraison",
  LivraisonSchema,
);

PointVenteSchema.pre("findOneAndDelete", async function (next) {
  const pointVente = this.getQuery()._id;
  await Produit.deleteMany({ pointVente });
  next();
});
CategorieSchema.pre("findOneAndDelete", async function (next) {
  const categorie = this.getQuery()._id;
  await Produit.deleteMany({ categorie });
  next();
});
