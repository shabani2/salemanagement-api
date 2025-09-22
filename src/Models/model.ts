// models.ts
import mongoose, { Schema, Document } from "mongoose";
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
  IVente,
} from "./interfaceModels";
import bcrypt from "bcryptjs";
import {
  adjustStock,
  attachMouvementHooks,
  computeLivraisonScopes,
  computeOperationSource,
} from "../Middlewares/operationHandler";

export type UserRoleType = (typeof UserRole)[number];

const UserSchema = new Schema<IUser>(
  {
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    telephone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    adresse: { type: String, required: true },
    password: { type: String }, // pas requis à la création
    role: { type: String, enum: USER_ROLES, required: true },
    image: { type: String },
    pointVente: { type: Schema.Types.ObjectId, ref: "PointVente" },
    region: { type: Schema.Types.ObjectId, ref: "Region" },
    firstConnection: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
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

MouvementStockSchema.pre("save", async function (next) {
  try {
    const {
      type,
      statut,
      produit,
      quantite,
      pointVente,
      region,
      depotCentral,
    } = this as any;

    // Entrée & Commande: pas de contrôle de dispo
    if (type === "Entrée" || type === "Commande") return next();

    // LIVRAISON: vérifier le stock de la *source* uniquement
    if (type === "Livraison") {
      const { source, reasonIfInvalid } = computeLivraisonScopes(this);
      if (!source)
        return next(new Error(reasonIfInvalid || "Livraison invalide"));

      const srcStock = await Stock.findOne(source).lean().exec();
      if (!srcStock || srcStock.quantite < quantite) {
        return next(new Error("Stock source insuffisant pour la livraison"));
      }
      return next();
    }

    // VENTE / SORTIE: vérifier la source selon depotCentral/region/pointVente
    if (["Vente", "Sortie"].includes(type)) {
      const { source, reasonIfInvalid } = computeOperationSource(this);
      if (!source) return next(new Error(reasonIfInvalid || "Portée invalide"));

      // on applique la politique existante: seulement si statut est activé, on “consomme”
      if (statut) {
        const s = await Stock.findOne(source).lean().exec();
        if (!s || s.quantite < quantite) {
          return next(new Error("Stock insuffisant pour l'opération"));
        }
      }
      return next();
    }

    next();
  } catch (error) {
    next(error as mongoose.CallbackError);
  }
});

// POST-SAVE LOGIC

// MouvementStockSchema.post("save", async function (doc) {
//   try {
//     const {
//       produit,
//       quantite,
//       type,
//       statut,
//       pointVente,
//       montant,
//       region,
//       depotCentral,
//       transferApplied,
//     } = doc as any;

//     // ENTRÉE: on crédite directement la destination (region sinon central)
//     if (type === "Entrée") {
//       if (region) await adjustStock({ produit, region }, quantite, montant);
//       else
//         await adjustStock({ produit, depotCentral: true }, quantite, montant);
//       return;
//     }

//     // Pour les autres, si statut falsy et type !== Livraison, on ne touche pas (comportement existant)
//     if (!statut && type !== "Livraison") return;

//     // VENTE / SORTIE: décrémente la source quand statut=true
//     if (["Vente", "Sortie"].includes(type)) {
//       const { source, reasonIfInvalid } = computeOperationSource(doc);
//       if (!source) return console.error(reasonIfInvalid);
//       await adjustStock(source, -quantite, -montant);
//       return;
//     }

//     // LIVRAISON:
//     if (type === "Livraison") {
//       const { source, destination, reasonIfInvalid } =
//         computeLivraisonScopes(doc);
//       if (!source) return console.error(reasonIfInvalid);

//       // 1) Toujours décrémenter la source immédiatement
//       await adjustStock(source, -quantite, -montant);

//       // 2) Crédite la destination *seulement* si statut=true au moment de la création
//       if (statut && destination && !transferApplied) {
//         await adjustStock(destination, quantite, montant);
//         // Marquer comme appliqué pour éviter double crédit à l’update
//         await (doc.constructor as any).updateOne(
//           { _id: doc._id, transferApplied: { $ne: true } },
//           { $set: { transferApplied: true } },
//         );
//       }
//     }
//   } catch (err) {
//     console.error("Erreur post-save MouvementStock:", err);
//   }
// });

// On doit comparer ancien vs nouveau statut
// MouvementStockSchema.pre("save", async function (next) {
//   try {
//     const { type, statut, produit, quantite } = this as any;

//     // Entrée & Commande: pas de contrôle de dispo
//     if (type === "Entrée" || type === "Commande") return next();

//     // LIVRAISON: vérifier le stock de la *source* uniquement
//     if (type === "Livraison") {
//       const { source, reasonIfInvalid } = computeLivraisonScopes(this);
//       if (!source)
//         return next(new Error(reasonIfInvalid || "Livraison invalide"));

//       const srcStock = await Stock.findOne(source).lean().exec();
//       if (!srcStock || srcStock.quantite < quantite) {
//         return next(new Error("Stock source insuffisant pour la livraison"));
//       }
//       return next();
//     }

//     // VENTE / SORTIE: vérifier la source selon depotCentral/region/pointVente
//     if (["Vente", "Sortie"].includes(type)) {
//       const { source, reasonIfInvalid } = computeOperationSource(this);
//       if (!source) return next(new Error(reasonIfInvalid || "Portée invalide"));

//       // seulement si statut est activé, on “consomme”
//       if (statut) {
//         const s = await Stock.findOne(source).lean().exec();
//         if (!s || s.quantite < quantite) {
//           return next(new Error("Stock insuffisant pour l'opération"));
//         }
//       }
//       return next();
//     }

//     next();
//   } catch (error) {
//     next(error as mongoose.CallbackError);
//   }
// });

// POST-SAVE LOGIC

// On doit comparer ancien vs nouveau statut

if (!(MouvementStockSchema as any)._hooksAttached) {
  attachMouvementHooks(MouvementStockSchema);
  (MouvementStockSchema as any)._hooksAttached = true;
}

// UserSchema.methods.comparePassword = async function (
//   candidatePassword: string,
// ): Promise<boolean> {
//   console.log("Comparaison mdp =>");
//   console.log("Mot de passe en clair:", candidatePassword);
//   console.log("Mot de passe hashé:", this.password);
//   return await bcrypt.compare(candidatePassword, this.password);
// };

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




UserSchema.pre<IUser>("save", async function (next) {
  // Pourquoi: garantir hash si password défini/modifié
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
// UserSchema.methods.comparePassword = async function (candidate: string) {
//   if (!this.password) return false;
//   return bcrypt.compare(candidate, this.password);
// };


UserSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.bumpTokenVersion = async function () {
  // Invalide tous les JWT existants (payload.ver)
  this.tokenVersion += 1;
  await this.save();
};
