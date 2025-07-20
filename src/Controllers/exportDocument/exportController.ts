// /utils/exportMouvementStock.ts

import * as XLSX from "xlsx";
import { Parser as Json2CsvParser } from "json2csv";
import fs from "fs";

// /utils/exportMouvementStock.ts

import { Request, Response } from "express";

export async function exportMouvementStockHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { data, fileType = "xlsx" } = req.body;

  if (!Array.isArray(data)) {
    res.status(400).json({ error: "Invalid data format. Expected an array." });
    return;
  }

  const exportData = data.map((row, index) => {
    const produit = row.produit || {};
    const categorie = produit.categorie || {};
    const prix = ["Entrée", "Livraison", "Commande"].includes(row.type)
      ? (produit.prix ?? 0)
      : (produit.prixVente ?? 0);
    const prixVente = produit.prixVente ?? 0;
    const net = produit.netTopay ?? 0;
    const marge = produit.marge ?? 0;
    const tva = produit.tva ?? 0;
    const quantite = row.quantite ?? 0;

    return {
      "#": index + 1,
      Produit: produit.nom || "",
      Catégorie: categorie.nom || "",
      "Point de Vente": row.pointVente?.nom || "",
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
    const parser = new Json2CsvParser({ header: true });
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
}

//stock export handler
export async function exportStockHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { data, fileType = "xlsx" } = req.body;

  if (!Array.isArray(data)) {
    res.status(400).json({ error: "Invalid data format. Expected an array." });
    return;
  }

  const exportData = data.map((row: any, index: number) => {
    const produit = row.produit || {};
    const categorie = produit.categorie || {};
    const prix = produit.prix ?? 0;
    const marge = produit.marge ?? 0;
    const prixVente = produit.prixVente ?? 0;
    const net = produit.netTopay ?? 0;
    const tva = produit.tva ?? 0;
    const quantite = row.quantite ?? 0;

    return {
      "#": index + 1,
      Produit: produit.nom || "",
      Catégorie: categorie.nom || "",
      Quantité: quantite,
      Montant: row.montant?.toFixed(2) || "0.00",
      "Prix acquisition": prix.toFixed(2),
      "Valeur Marge": ((prix * marge) / 100).toFixed(2),
      "Net à Payer": net.toFixed(2),
      "TVA (%)": `${tva}%`,
      "Valeur TVA": ((net * tva) / 100).toFixed(2),
      "Prix de Vente": prixVente.toFixed(2),
      "Point de Vente": row.pointVente?.nom || "Depot Central",
      "Créé le": new Date(row.createdAt).toLocaleDateString(),
    };
  });

  const fileName = `stocks_export_${Date.now()}`;

  if (fileType === "csv") {
    const parser = new Json2CsvParser({ header: true });
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
}

export async function exportUserHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { data, fileType = "xlsx" } = req.body;

  if (!Array.isArray(data)) {
    res.status(400).json({ error: "Invalid data format. Expected an array." });
    return;
  }

  const exportData = data.map((row: any, index: number) => {
    return {
      "#": index + 1,
      Nom: row.nom || "",
      Prénom: row.prenom || "",
      Email: row.email || "",
      Téléphone: row.telephone || "",
      Région: row.region?.nom || row.pointVente?.region?.nom || "Depot Central",
      "Point de Vente": row.pointVente?.nom || "Depot Central",
      Rôle: row.role || "",
      "Créé le": new Date(row.createdAt).toLocaleDateString(),
    };
  });

  const fileName = `users_export_${Date.now()}`;

  if (fileType === "csv") {
    const parser = new Json2CsvParser({ header: true });
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
}

//export function for product

export async function exportProduitHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { data, fileType = "xlsx" } = req.body;

  if (!Array.isArray(data)) {
    res.status(400).json({ error: "Invalid data format. Expected an array." });
    return;
  }

  const exportData = data.map((row: any, index: number) => {
    const categorie = row.categorie || {};
    const prix = row.prix ?? 0;
    const marge = row.marge ?? 0;
    const net = row.netTopay ?? 0;
    const tva = row.tva ?? 0;
    const prixVente = row.prixVente ?? 0;
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
    const parser = new Json2CsvParser({ header: true });
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
}

//export function for point de vente
export async function exportPointVenteHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { data, fileType = "xlsx" } = req.body;

  if (!Array.isArray(data)) {
    res.status(400).json({ error: "Invalid data format. Expected an array." });
    return;
  }

  const exportData = data.map((row: any, index: number) => {
    return {
      "#": index + 1,
      Région: row.region?.nom || "N/A",
      Nom: row.nom || "",
      Adresse: row.adresse || "",
      "Créé le": new Date(row.createdAt).toLocaleDateString(),
    };
  });

  const fileName = `points_vente_export_${Date.now()}`;

  if (fileType === "csv") {
    const parser = new Json2CsvParser({ header: true });
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
}
//export function for region
export async function exportRegionHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { data, fileType = "xlsx" } = req.body;

  if (!Array.isArray(data)) {
    res.status(400).json({ error: "Invalid data format. Expected an array." });
    return;
  }

  const exportData = data.map((row: any, index: number) => {
    return {
      "#": index + 1,
      Nom: row.nom || "",
      "Créé le": new Date(row.createdAt).toLocaleDateString(),
    };
  });

  const fileName = `regions_export_${Date.now()}`;

  if (fileType === "csv") {
    const parser = new Json2CsvParser({ header: true });
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
}
//export function for categorie
export async function exportCategorieHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { data, fileType = "xlsx" } = req.body;

  if (!Array.isArray(data)) {
    res.status(400).json({ error: "Invalid data format. Expected an array." });
    return;
  }

  const exportData = data.map((row: any, index: number) => {
    return {
      "#": index + 1,
      Nom: row.nom || "",
      Type: row.type || "",
      "Créé le": new Date(row.createdAt).toLocaleDateString(),
    };
  });

  const fileName = `categories_export_${Date.now()}`;

  if (fileType === "csv") {
    const parser = new Json2CsvParser({ header: true });
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
}
