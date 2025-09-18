"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
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
exports.Commande =
  exports.CommandeSchema =
  exports.CommandeProduit =
  exports.CommandeProduitSchema =
  exports.Organisations =
  exports.MouvementStock =
  exports.Stock =
  exports.Region =
  exports.PointVente =
  exports.Produit =
  exports.Categorie =
  exports.User =
    void 0;
// models.ts
const mongoose_1 = __importStar(require("mongoose"));
const constant_1 = require("../Utils/constant");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const operationHandler_1 = require("../Middlewares/operationHandler");
const UserSchema = new mongoose_1.Schema(
  {
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    telephone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    adresse: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: constant_1.UserRole, required: true },
    image: { type: String },
    pointVente: { type: mongoose_1.Schema.Types.ObjectId, ref: "PointVente" },
    region: { type: mongoose_1.Schema.Types.ObjectId, ref: "Region" },
  },
  { timestamps: true },
);
const CategorieSchema = new mongoose_1.Schema(
  {
    nom: { type: String, required: true },
    type: { type: String, required: true },
    image: { type: String },
  },
  { timestamps: true },
);
const ProduitSchema = new mongoose_1.Schema(
  {
    nom: { type: String, required: true },
    categorie: {
      type: mongoose_1.Schema.Types.ObjectId,
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
const PointVenteSchema = new mongoose_1.Schema(
  {
    nom: { type: String, required: true },
    adresse: { type: String, required: true },
    region: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Region",
      required: true,
    },
    stock: [
      {
        produit: {
          type: mongoose_1.Schema.Types.ObjectId,
          ref: "Produit",
          required: true,
        },
        quantite: { type: Number, required: true, default: 0 },
      },
    ],
  },
  { timestamps: true },
);
const RegionSchema = new mongoose_1.Schema(
  {
    nom: { type: String, required: true },
    ville: { type: String, required: true },
  },
  { timestamps: true },
);
const StockSchema = new mongoose_1.Schema(
  {
    produit: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Produit",
      required: true,
    },
    quantite: { type: Number, required: true, default: 0 },
    montant: { type: Number, required: true, default: 0 },
    pointVente: { type: mongoose_1.Schema.Types.ObjectId, ref: "PointVente" },
    region: { type: mongoose_1.Schema.Types.ObjectId, ref: "Region" },
    depotCentral: { type: Boolean, default: false },
  },
  { timestamps: true },
);
CategorieSchema.pre("findOneAndDelete", function (next) {
  return __awaiter(this, void 0, void 0, function* () {
    try {
      const categorie = this.getQuery()._id;
      yield exports.Produit.deleteMany({ categorie });
      next();
    } catch (err) {
      next(err);
    }
  });
});
const MouvementStockSchema = new mongoose_1.Schema(
  {
    pointVente: {
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "PointVente",
      required: false,
    },
    commandeId: {
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "Commande",
      default: null,
    },
    region: {
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "Region",
      required: false,
    },
    user: {
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    depotCentral: { type: Boolean, default: false },
    produit: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Produit",
      required: true,
    },
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
MouvementStockSchema.pre("save", function (next) {
  return __awaiter(this, void 0, void 0, function* () {
    try {
      const {
        type,
        statut,
        produit,
        quantite,
        pointVente,
        region,
        depotCentral,
      } = this;
      // Entrée & Commande: pas de contrôle de dispo
      if (type === "Entrée" || type === "Commande") return next();
      // LIVRAISON: vérifier le stock de la *source* uniquement
      if (type === "Livraison") {
        const { source, reasonIfInvalid } = (0,
        operationHandler_1.computeLivraisonScopes)(this);
        if (!source)
          return next(new Error(reasonIfInvalid || "Livraison invalide"));
        const srcStock = yield exports.Stock.findOne(source).lean().exec();
        if (!srcStock || srcStock.quantite < quantite) {
          return next(new Error("Stock source insuffisant pour la livraison"));
        }
        return next();
      }
      // VENTE / SORTIE: vérifier la source selon depotCentral/region/pointVente
      if (["Vente", "Sortie"].includes(type)) {
        const { source, reasonIfInvalid } = (0,
        operationHandler_1.computeOperationSource)(this);
        if (!source)
          return next(new Error(reasonIfInvalid || "Portée invalide"));
        // on applique la politique existante: seulement si statut est activé, on “consomme”
        if (statut) {
          const s = yield exports.Stock.findOne(source).lean().exec();
          if (!s || s.quantite < quantite) {
            return next(new Error("Stock insuffisant pour l'opération"));
          }
        }
        return next();
      }
      next();
    } catch (error) {
      next(error);
    }
  });
});
// POST-SAVE LOGIC
MouvementStockSchema.post("save", function (doc) {
  return __awaiter(this, void 0, void 0, function* () {
    try {
      const {
        produit,
        quantite,
        type,
        statut,
        pointVente,
        montant,
        region,
        depotCentral,
        transferApplied,
      } = doc;
      // ENTRÉE: on crédite directement la destination (region sinon central)
      if (type === "Entrée") {
        if (region)
          yield (0, operationHandler_1.adjustStock)(
            { produit, region },
            quantite,
            montant,
          );
        else
          yield (0, operationHandler_1.adjustStock)(
            { produit, depotCentral: true },
            quantite,
            montant,
          );
        return;
      }
      // Pour les autres, si statut falsy et type !== Livraison, on ne touche pas (comportement existant)
      if (!statut && type !== "Livraison") return;
      // VENTE / SORTIE: décrémente la source quand statut=true
      if (["Vente", "Sortie"].includes(type)) {
        const { source, reasonIfInvalid } = (0,
        operationHandler_1.computeOperationSource)(doc);
        if (!source) return console.error(reasonIfInvalid);
        yield (0, operationHandler_1.adjustStock)(source, -quantite, -montant);
        return;
      }
      // LIVRAISON:
      if (type === "Livraison") {
        const { source, destination, reasonIfInvalid } = (0,
        operationHandler_1.computeLivraisonScopes)(doc);
        if (!source) return console.error(reasonIfInvalid);
        // 1) Toujours décrémenter la source immédiatement
        yield (0, operationHandler_1.adjustStock)(source, -quantite, -montant);
        // 2) Crédite la destination *seulement* si statut=true au moment de la création
        if (statut && destination && !transferApplied) {
          yield (0, operationHandler_1.adjustStock)(
            destination,
            quantite,
            montant,
          );
          // Marquer comme appliqué pour éviter double crédit à l’update
          yield doc.constructor.updateOne(
            { _id: doc._id, transferApplied: { $ne: true } },
            { $set: { transferApplied: true } },
          );
        }
      }
    } catch (err) {
      console.error("Erreur post-save MouvementStock:", err);
    }
  });
});
// On doit comparer ancien vs nouveau statut
MouvementStockSchema.pre("save", function (next) {
  return __awaiter(this, void 0, void 0, function* () {
    try {
      const { type, statut, produit, quantite } = this;
      // Entrée & Commande: pas de contrôle de dispo
      if (type === "Entrée" || type === "Commande") return next();
      // LIVRAISON: vérifier le stock de la *source* uniquement
      if (type === "Livraison") {
        const { source, reasonIfInvalid } = (0,
        operationHandler_1.computeLivraisonScopes)(this);
        if (!source)
          return next(new Error(reasonIfInvalid || "Livraison invalide"));
        const srcStock = yield exports.Stock.findOne(source).lean().exec();
        if (!srcStock || srcStock.quantite < quantite) {
          return next(new Error("Stock source insuffisant pour la livraison"));
        }
        return next();
      }
      // VENTE / SORTIE: vérifier la source selon depotCentral/region/pointVente
      if (["Vente", "Sortie"].includes(type)) {
        const { source, reasonIfInvalid } = (0,
        operationHandler_1.computeOperationSource)(this);
        if (!source)
          return next(new Error(reasonIfInvalid || "Portée invalide"));
        // seulement si statut est activé, on “consomme”
        if (statut) {
          const s = yield exports.Stock.findOne(source).lean().exec();
          if (!s || s.quantite < quantite) {
            return next(new Error("Stock insuffisant pour l'opération"));
          }
        }
        return next();
      }
      next();
    } catch (error) {
      next(error);
    }
  });
});
// POST-SAVE LOGIC
// On doit comparer ancien vs nouveau statut
if (!MouvementStockSchema._hooksAttached) {
  (0, operationHandler_1.attachMouvementHooks)(MouvementStockSchema);
  MouvementStockSchema._hooksAttached = true;
}
UserSchema.methods.comparePassword = function (candidatePassword) {
  return __awaiter(this, void 0, void 0, function* () {
    console.log("Comparaison mdp =>");
    console.log("Mot de passe en clair:", candidatePassword);
    console.log("Mot de passe hashé:", this.password);
    return yield bcryptjs_1.default.compare(candidatePassword, this.password);
  });
};
exports.User = mongoose_1.default.model("User", UserSchema);
exports.Categorie = mongoose_1.default.model("Categorie", CategorieSchema);
exports.Produit = mongoose_1.default.model("Produit", ProduitSchema);
exports.PointVente = mongoose_1.default.model("PointVente", PointVenteSchema);
exports.Region = mongoose_1.default.model("Region", RegionSchema);
exports.Stock = mongoose_1.default.model("Stock", StockSchema);
exports.MouvementStock = mongoose_1.default.model(
  "MouvementStock",
  MouvementStockSchema,
);
const OrganisationSchema = new mongoose_1.Schema(
  {
    nom: { type: String, required: true },
    idNat: { type: String, required: true },
    contact: { type: String, required: true },
    numeroImpot: { type: String, required: true },
    logo: { type: String },
    devise: { type: String, required: true },
    superAdmin: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pays: { type: String, required: true },
    emailEntreprise: { type: String, required: true },
  },
  { timestamps: true },
);
exports.Organisations = mongoose_1.default.model(
  "Organisation",
  OrganisationSchema,
);
exports.CommandeProduitSchema = new mongoose_1.Schema(
  {
    commandeId: {
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "Commande",
      required: true,
    },
    produit: {
      type: mongoose_1.default.Schema.Types.ObjectId,
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
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "MouvementStock",
      default: null,
    },
  },
  { timestamps: true },
);
exports.CommandeProduit = mongoose_1.default.model(
  "CommandeProduit",
  exports.CommandeProduitSchema,
);
exports.CommandeSchema = new mongoose_1.Schema(
  {
    numero: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fournisseur: {
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "User",
    },
    region: {
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "Region",
    },
    pointVente: {
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "PointVente",
    },
    requestedRegion: {
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "Region",
    },
    requestedPointVente: {
      type: mongoose_1.default.Schema.Types.ObjectId,
      ref: "PointVente",
    },
    depotCentral: {
      type: Boolean,
      default: false,
    },
    produits: [
      {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
exports.Commande = mongoose_1.default.model("Commande", exports.CommandeSchema);
