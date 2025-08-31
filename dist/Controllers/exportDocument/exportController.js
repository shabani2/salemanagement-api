"use strict";
// /utils/exportMouvementStock.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportMouvementStockHandler = exportMouvementStockHandler;
exports.exportStockHandler = exportStockHandler;
exports.exportUserHandler = exportUserHandler;
exports.exportProduitHandler = exportProduitHandler;
exports.exportPointVenteHandler = exportPointVenteHandler;
exports.exportRegionHandler = exportRegionHandler;
exports.exportCategorieHandler = exportCategorieHandler;
const XLSX = __importStar(require("xlsx"));
const json2csv_1 = require("json2csv");
function exportMouvementStockHandler(req, res) {
  return __awaiter(this, void 0, void 0, function* () {
    const { data, fileType = "xlsx" } = req.body;
    if (!Array.isArray(data)) {
      res
        .status(400)
        .json({ error: "Invalid data format. Expected an array." });
      return;
    }
    const exportData = data.map((row, index) => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const produit = row.produit || {};
      const categorie = produit.categorie || {};
      const prix = ["Entrée", "Livraison", "Commande"].includes(row.type)
        ? (_a = produit.prix) !== null && _a !== void 0
          ? _a
          : 0
        : (_b = produit.prixVente) !== null && _b !== void 0
          ? _b
          : 0;
      const prixVente =
        (_c = produit.prixVente) !== null && _c !== void 0 ? _c : 0;
      const net = (_d = produit.netTopay) !== null && _d !== void 0 ? _d : 0;
      const marge = (_e = produit.marge) !== null && _e !== void 0 ? _e : 0;
      const tva = (_f = produit.tva) !== null && _f !== void 0 ? _f : 0;
      const quantite = (_g = row.quantite) !== null && _g !== void 0 ? _g : 0;
      return {
        "#": index + 1,
        Produit: produit.nom || "",
        Catégorie: categorie.nom || "",
        "Point de Vente":
          ((_h = row.pointVente) === null || _h === void 0 ? void 0 : _h.nom) ||
          "",
        Operation: row.type,
        Quantité: quantite,
        "Prix Unitaire": prix.toFixed(2),
        Montant: (prix * quantite).toFixed(2),
        "Valeur Marge": (((prix * marge) / 100) * quantite).toFixed(2),
        "Net à Payer": (net * quantite).toFixed(2),
        "Valeur TVA": (((net * tva) / 100) * quantite).toFixed(2),
        "Prix de Vente": (prixVente * quantite).toFixed(2),
        Statut: row.statut ? "Validé" : "En attente",
        "Créé le": new Date(row.createdAt).toLocaleDateString(),
      };
    });
    const fileName = `mouvement_stock_export_${Date.now()}`;
    if (fileType === "csv") {
      const parser = new json2csv_1.Parser({ header: true });
      const csv = parser.parse(exportData);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.csv`,
      );
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    } else {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "MouvementStock");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.xlsx`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(buffer);
    }
  });
}
//stock export handler
function exportStockHandler(req, res) {
  return __awaiter(this, void 0, void 0, function* () {
    const { data, fileType = "xlsx" } = req.body;
    if (!Array.isArray(data)) {
      res
        .status(400)
        .json({ error: "Invalid data format. Expected an array." });
      return;
    }
    const exportData = data.map((row, index) => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const produit = row.produit || {};
      const categorie = produit.categorie || {};
      const prix = (_a = produit.prix) !== null && _a !== void 0 ? _a : 0;
      const marge = (_b = produit.marge) !== null && _b !== void 0 ? _b : 0;
      const prixVente =
        (_c = produit.prixVente) !== null && _c !== void 0 ? _c : 0;
      const net = (_d = produit.netTopay) !== null && _d !== void 0 ? _d : 0;
      const tva = (_e = produit.tva) !== null && _e !== void 0 ? _e : 0;
      const quantite = (_f = row.quantite) !== null && _f !== void 0 ? _f : 0;
      return {
        "#": index + 1,
        Produit: produit.nom || "",
        Catégorie: categorie.nom || "",
        Quantité: quantite,
        Montant:
          ((_g = row.montant) === null || _g === void 0
            ? void 0
            : _g.toFixed(2)) || "0.00",
        "Prix acquisition": prix.toFixed(2),
        "Valeur Marge": ((prix * marge) / 100).toFixed(2),
        "Net à Payer": net.toFixed(2),
        "TVA (%)": `${tva}%`,
        "Valeur TVA": ((net * tva) / 100).toFixed(2),
        "Prix de Vente": prixVente.toFixed(2),
        "Point de Vente":
          ((_h = row.pointVente) === null || _h === void 0 ? void 0 : _h.nom) ||
          "Depot Central",
        "Créé le": new Date(row.createdAt).toLocaleDateString(),
      };
    });
    const fileName = `stocks_export_${Date.now()}`;
    if (fileType === "csv") {
      const parser = new json2csv_1.Parser({ header: true });
      const csv = parser.parse(exportData);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.csv`,
      );
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    } else {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stocks");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.xlsx`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(buffer);
    }
  });
}
function exportUserHandler(req, res) {
  return __awaiter(this, void 0, void 0, function* () {
    const { data, fileType = "xlsx" } = req.body;
    if (!Array.isArray(data)) {
      res
        .status(400)
        .json({ error: "Invalid data format. Expected an array." });
      return;
    }
    const exportData = data.map((row, index) => {
      var _a, _b, _c, _d;
      return {
        "#": index + 1,
        Nom: row.nom || "",
        Prénom: row.prenom || "",
        Email: row.email || "",
        Téléphone: row.telephone || "",
        Région:
          ((_a = row.region) === null || _a === void 0 ? void 0 : _a.nom) ||
          ((_c =
            (_b = row.pointVente) === null || _b === void 0
              ? void 0
              : _b.region) === null || _c === void 0
            ? void 0
            : _c.nom) ||
          "Depot Central",
        "Point de Vente":
          ((_d = row.pointVente) === null || _d === void 0 ? void 0 : _d.nom) ||
          "Depot Central",
        Rôle: row.role || "",
        "Créé le": new Date(row.createdAt).toLocaleDateString(),
      };
    });
    const fileName = `users_export_${Date.now()}`;
    if (fileType === "csv") {
      const parser = new json2csv_1.Parser({ header: true });
      const csv = parser.parse(exportData);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.csv`,
      );
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    } else {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.xlsx`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(buffer);
    }
  });
}
//export function for product
function exportProduitHandler(req, res) {
  return __awaiter(this, void 0, void 0, function* () {
    const { data, fileType = "xlsx" } = req.body;
    if (!Array.isArray(data)) {
      res
        .status(400)
        .json({ error: "Invalid data format. Expected an array." });
      return;
    }
    const exportData = data.map((row, index) => {
      var _a, _b, _c, _d, _e;
      const categorie = row.categorie || {};
      const prix = (_a = row.prix) !== null && _a !== void 0 ? _a : 0;
      const marge = (_b = row.marge) !== null && _b !== void 0 ? _b : 0;
      const net = (_c = row.netTopay) !== null && _c !== void 0 ? _c : 0;
      const tva = (_d = row.tva) !== null && _d !== void 0 ? _d : 0;
      const prixVente = (_e = row.prixVente) !== null && _e !== void 0 ? _e : 0;
      const unite = row.unite || "N/A";
      return {
        "#": index + 1,
        Nom: row.nom || "",
        Catégorie: categorie.nom || "",
        "Prix Unitaire": prix.toFixed(2),
        "Marge (%)": marge,
        "Valeur Marge": ((prix * marge) / 100).toFixed(2),
        "Prix de vente unitaire": net.toFixed(2),
        "TVA (%)": `${tva}%`,
        "Valeur TVA": ((net * tva) / 100).toFixed(2),
        "TTC unitaire": prixVente.toFixed(2),
        Unité: unite,
        "Créé le": new Date(row.createdAt).toLocaleDateString(),
      };
    });
    const fileName = `produits_export_${Date.now()}`;
    if (fileType === "csv") {
      const parser = new json2csv_1.Parser({ header: true });
      const csv = parser.parse(exportData);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.csv`,
      );
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    } else {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Produits");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.xlsx`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(buffer);
    }
  });
}
//export function for point de vente
function exportPointVenteHandler(req, res) {
  return __awaiter(this, void 0, void 0, function* () {
    const { data, fileType = "xlsx" } = req.body;
    if (!Array.isArray(data)) {
      res
        .status(400)
        .json({ error: "Invalid data format. Expected an array." });
      return;
    }
    const exportData = data.map((row, index) => {
      var _a;
      return {
        "#": index + 1,
        Région:
          ((_a = row.region) === null || _a === void 0 ? void 0 : _a.nom) ||
          "N/A",
        Nom: row.nom || "",
        Adresse: row.adresse || "",
        "Créé le": new Date(row.createdAt).toLocaleDateString(),
      };
    });
    const fileName = `points_vente_export_${Date.now()}`;
    if (fileType === "csv") {
      const parser = new json2csv_1.Parser({ header: true });
      const csv = parser.parse(exportData);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.csv`,
      );
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    } else {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PointsVente");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.xlsx`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(buffer);
    }
  });
}
//export function for region
function exportRegionHandler(req, res) {
  return __awaiter(this, void 0, void 0, function* () {
    const { data, fileType = "xlsx" } = req.body;
    if (!Array.isArray(data)) {
      res
        .status(400)
        .json({ error: "Invalid data format. Expected an array." });
      return;
    }
    const exportData = data.map((row, index) => {
      return {
        "#": index + 1,
        Nom: row.nom || "",
        "Créé le": new Date(row.createdAt).toLocaleDateString(),
      };
    });
    const fileName = `regions_export_${Date.now()}`;
    if (fileType === "csv") {
      const parser = new json2csv_1.Parser({ header: true });
      const csv = parser.parse(exportData);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.csv`,
      );
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    } else {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Regions");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.xlsx`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(buffer);
    }
  });
}
//export function for categorie
function exportCategorieHandler(req, res) {
  return __awaiter(this, void 0, void 0, function* () {
    const { data, fileType = "xlsx" } = req.body;
    if (!Array.isArray(data)) {
      res
        .status(400)
        .json({ error: "Invalid data format. Expected an array." });
      return;
    }
    const exportData = data.map((row, index) => {
      return {
        "#": index + 1,
        Nom: row.nom || "",
        Type: row.type || "",
        "Créé le": new Date(row.createdAt).toLocaleDateString(),
      };
    });
    const fileName = `categories_export_${Date.now()}`;
    if (fileType === "csv") {
      const parser = new json2csv_1.Parser({ header: true });
      const csv = parser.parse(exportData);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.csv`,
      );
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    } else {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Categories");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.xlsx`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(buffer);
    }
  });
}
