import mongoose from "mongoose";
import { UserRoleType } from "./model";

// Modèle Utilisateur
export interface IUser extends Document {
  id?: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse: string;
  password: string;
  role: UserRoleType;
  image?: string;
  pointVente?: mongoose.Types.ObjectId;
  region?: mongoose.Types.ObjectId;
  comparePassword(plainText: string): Promise<boolean>;
}

// Modèle Organisation
// Modèle Catégorie de produit
export interface ICategorie extends Document {
  nom: string;
  type: string;
  image?: string;
}

// Modèle Produit
export interface IProduit {
  nom: string;
  categorie: mongoose.Types.ObjectId;
  prix: number;
  marge?: number;
  seuil?: number;
  netTopay?: number;
  prixVente: number;
  tva: number;
  unite?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Modèle Point de Vente
export interface IPointVente extends Document {
  nom: string;
  adresse: string;
  region: mongoose.Types.ObjectId;
  stock: { produit: mongoose.Types.ObjectId; quantite: number }[];
}
// Modèle Regions
export interface IRegion extends Document {
  nom: string;
  ville: string;
}
// Modèle Vente
export interface IVente extends Document {
  vendeur: mongoose.Types.ObjectId;
  pointVente: mongoose.Types.ObjectId;
  produits: {
    produit: mongoose.Types.ObjectId;
    quantite: number;
    prixTotal: number;
  }[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
}

// Modèle Livraison
export interface ILivraison extends Document {
  expediteur: mongoose.Types.ObjectId;
  pointVente: mongoose.Types.ObjectId;
  produits: { produit: mongoose.Types.ObjectId; quantite: number }[];
  statut: "En Attente" | "Validée";
}

// Modèle Commande Client
// export interface ICommande extends Document {
//   client: mongoose.Types.ObjectId;
//   produits: { produit: mongoose.Types.ObjectId; quantite: number }[];
//   totalHT: Number;
//   totalTVA: Number;
//   totalTTC: Number;
//   statut: "En Attente" | "En Cours" | "Livrée";
// }

// Modèle MouvementStock
export interface IMouvementStock extends Document {
  pointVente?: mongoose.Types.ObjectId;
  depotCentral?: Boolean;
  commandeId?: mongoose.Types.ObjectId; // Nullable
  region?: mongoose.Types.ObjectId;
  produit: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: "Entrée" | "Sortie" | "Vente" | "Livraison" | "Commande";
  quantite: number;
  montant: number;
  statut: boolean;
}

export interface IStock extends Document {
  produit: mongoose.Types.ObjectId | IProduit;
  quantite: number;
  montant: number;
  pointVente?: mongoose.Types.ObjectId | IPointVente;
  region?: mongoose.Types.ObjectId | IRegion;
  depotCentral: boolean;
}

export interface IOrganisation extends Document {
  numeroImpot: string;
  idNat: string;  
  email: any;
  numeroTVA: any; 
  nom: string;
  rccm: string;
  contact: string;
  siegeSocial: string;
  logo?: string;
  devise: string;
  superAdmin: string | IUser;
  pays: string;
  emailEntreprise: string;
  createdAt: Date;
  updatedAt: Date;
}



export interface ICommandeProduit {
  produit: mongoose.Types.ObjectId;
  quantite: number;
  statut: 'attente' | 'livré' | 'annulé';
  mouvementStockId?: mongoose.Types.ObjectId; // Nullable, rempli quand livré
}




export interface ICommande extends Document {
  numero: string;
  user: mongoose.Types.ObjectId;
  region?: mongoose.Types.ObjectId;
  pointVente?: mongoose.Types.ObjectId;
  depotCentral?: boolean;
  statut: 'attente' | 'livrée' | 'annulée';
  produits: ICommandeProduit[];
  createdAt?: Date;
  updatedAt?: Date;
}
