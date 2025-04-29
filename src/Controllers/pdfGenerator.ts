// src/controllers/pdfGenerator.ts
import { Request, Response } from "express";
import { format } from "date-fns";
import PDFDocument from "pdfkit";
import path from "path";

interface Organisation {
  logo: string;
  nom: string;
  adresse: string;
  email: string;
  siege: string;
  pays: string;
}

interface User {
  nom: string;
  adresse: string;
  id: string;
}

interface Mouvement {
  produitNom: string;
  quantite: number;
  montant: number;
  type: string;
  produit: string;
  depotCentral?: boolean;
  pointVente?: any;
  statut: boolean;
}

interface Destinateur {
  nom: string;
  adresse: string;
}

const logoPath = path.join(__dirname, "./../assets/default/inaf.png");

export const generateStockPdf = async (req: Request, res: Response) => {
  try {
    const { organisation, user, mouvements, type, destinateur, serie } = req.body;

    const doc = new PDFDocument({ margin: 30 });
    const chunks: any[] = [];

    const typeMap: Record<string, string> = {
      Entree: "Bon d'entrée",
      Sortie: "Bon de sortie",
      Livraison: "Bon de livraison",
      Vente: "Facture",
      Commande: "Bon de commande",
    };
    const docType = typeMap[type] || "Document";

    const showTVA = !(type === "Livraison" || type === "Entree");

    doc.on("data", (chunk: any) => chunks.push(chunk));
    doc.on("end", () => {
      const result = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${docType}.pdf`);
      res.send(result);
    });

    // Logo
    doc.image(logoPath, { fit: [80, 80], align: "center" });
    doc.moveDown(0.5);

    // Organisation info
    doc
      .fontSize(12)
      .text(organisation.nom, { align: "center" })
      .text(organisation.adresse, { align: "center" })
      .text(organisation.email, { align: "center" })
      .text(organisation.siege, { align: "center" })
      .text(organisation.pays, { align: "center" });

    doc.moveDown(1);

    // Document header
    doc
      .fontSize(10)
      .text(docType, { align: "right" })
      .text(`Date: ${format(new Date(), "yyyy-MM-dd")}`, { align: "right" })
      .text(`Série: ${serie}`, { align: "right" })
      .text(`User ID: ${user.id}`, { align: "right" });

    doc.moveDown(1);

    // User and Destinateur
    doc.fontSize(10);
    doc.text(`Utilisateur: ${user.nom}
Adresse: ${user.adresse}`, 30, doc.y);

    if (destinateur) {
      doc.text(`Destinataire: ${destinateur.nom}
Adresse: ${destinateur.adresse}`, 350, doc.y - 30);
    }

    doc.moveDown(2);

    // Détail de Produit - Table Header
    doc.fontSize(12).font("Helvetica-Bold").text("Détail de Produit", { underline: true });
    doc.moveDown(0.5);

    // Table
    const tableTop = doc.y;
    const itemSpacing = 20;

    doc.fontSize(10);

    // Draw header
    doc.text("Nom Produit", 30, tableTop, { width: 100 });
    doc.text("Prix Unitaire", 150, tableTop, { width: 100 });
    doc.text("Quantité", 270, tableTop, { width: 100 });
    doc.text("Montant", 390, tableTop, { width: 100 });

    doc.moveTo(30, tableTop - 2).lineTo(550, tableTop - 2).stroke();
    doc.moveTo(30, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 20;
    let total = 0;

    mouvements.forEach((m: Mouvement) => {
      const prixUnitaire = m.montant / m.quantite;
      total += m.montant;

      doc.text(m.produitNom, 30, y, { width: 100 });
      doc.text(prixUnitaire.toFixed(2), 150, y, { width: 100 });
      doc.text(m.quantite.toString(), 270, y, { width: 100 });
      doc.text(m.montant.toFixed(2), 390, y, { width: 100 });

      doc.moveTo(30, y + 15).lineTo(550, y + 15).stroke();
      y += 20;
    });

    doc.moveDown(2);

    // Totals
    doc.font("Helvetica-Bold");
    doc.text("Sous-total HT:", 300, y + 10, { continued: true });
    doc.text(`${total.toFixed(2)}`, 400, y + 10);

    if (showTVA) {
      const totalTVA = total * 0.2;
      const totalReduction = 0;
      const net = total + totalTVA - totalReduction;

      doc.text("TVA (20%):", 300, y + 30, { continued: true });
      doc.text(`${totalTVA.toFixed(2)}`, 400, y + 30);

      doc.text("Réduction:", 300, y + 50, { continued: true });
      doc.text(`${totalReduction.toFixed(2)}`, 400, y + 50);

      doc.text("Net à payer:", 300, y + 70, { continued: true });
      doc.text(`${net.toFixed(2)}`, 400, y + 70);
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la génération du PDF", error: err });
  }
};
