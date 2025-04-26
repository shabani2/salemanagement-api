// models.ts
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
  IStock,
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
    depotCentral: { type: Boolean, default: false },
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
MouvementStockSchema.pre("save", async function (next) {
  try {
    const { type, statut, produit, quantite, pointVente } = this;

    if (type === "Entrée") return next();

    if (type === "Livraison") {
      const depotStock = await Stock.findOne({ produit, depotCentral: true });
      if (!depotStock || depotStock.quantite < quantite) {
        return next(new Error("Stock insuffisant au dépôt central"));
      }
      return next();
    }

    if (!statut) return next();

    const pointStock = await Stock.findOne({ produit, pointVente });
    if (!pointStock || pointStock.quantite < quantite) {
      return next(new Error("Stock insuffisant au point de vente"));
    }

    next();
  } catch (error) {
    next(error as mongoose.CallbackError);
  }
});

// POST-SAVE LOGIC
MouvementStockSchema.post("save", async function (doc) {
  try {
    const { produit, quantite, type, statut, pointVente, montant } = doc;

    const adjustStock = async (
      filter: Record<string, any>,
      qtyChange: number,
      montantChange: number,
    ) => {
      try {
        await Stock.findOneAndUpdate(
          filter,
          {
            $inc: { quantite: qtyChange, montant: montantChange },
            $setOnInsert: { produit: filter.produit },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        );
      } catch (err) {
        console.error("Erreur ajustement stock:", err);
      }
    };

    if (type === "Entrée") {
      await adjustStock({ produit, depotCentral: true }, quantite, montant);
      return;
    }

    if (!statut && type !== "Livraison") return;

    if (["Sortie", "Vente", "Commande"].includes(type)) {
      if (!pointVente) return;
      await adjustStock({ produit, pointVente }, -quantite, -montant);
    }

    if (type === "Livraison") {
      if (!pointVente) return;
      await adjustStock({ produit, pointVente }, quantite, montant);
      await adjustStock({ produit, depotCentral: true }, -quantite, -montant);
    }
  } catch (err) {
    console.error("Erreur post-save MouvementStock:", err);
  }
});

UserSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err as mongoose.CallbackError);
  }
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  console.log("Comparaison mdp =>");
  console.log("Mot de passe en clair:", candidatePassword);
  console.log("Mot de passe hashé:", this.password);
  return await bcrypt.compare(candidatePassword, this.password);
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
export const Commande = mongoose.model<ICommande>("Commande", CommandeSchema);
export const Stock = mongoose.model<IStock>("Stock", StockSchema);

export const MouvementStock = mongoose.model<IMouvementStock>(
  "MouvementStock",
  MouvementStockSchema,
);

const OrganisationSchema = new Schema<IOrganisation>(
  {
    nom: { type: String, required: true },
    rccm: { type: String, required: true },
    contact: { type: String, required: true },
    siegeSocial: { type: String, required: true },
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
