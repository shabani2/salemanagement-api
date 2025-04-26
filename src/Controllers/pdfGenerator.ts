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
const logo = path.join(__dirname, "./../assets/default/inaf.png");
export const generateStockPdf = async (req: Request, res: Response) => {
  try {
    const { organisation, user, mouvements, type, destinateur, serie } =
      req.body;
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

    doc.on("data", (chunk: any) => chunks.push(chunk));
    doc.on("end", () => {
      const result = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${docType}.pdf`,
      );
      res.send(result);
    });

    // Header line
    doc
      .image(logo, { fit: [80, 80] })
      .fontSize(10)
      .text(
        `${organisation.nom}\n${organisation.adresse}\n${organisation.email}\n${organisation.siege}\n${organisation.pays}`,
        100,
        20,
      )
      .text(
        `${docType}\nDate: ${format(new Date(), "yyyy-MM-dd")}\nSerie: ${serie}\nUser ID: ${user.id}`,
        400,
        20,
      );

    doc.moveDown();

    // Second line
    doc.text(`Utilisateur: ${user.nom}\nAdresse: ${user.adresse}`, 30, 120);
    if (destinateur) {
      doc.text(
        `Destinataire: ${destinateur.nom}\nAdresse: ${destinateur.adresse}`,
        350,
        120,
      );
    }

    // Third line - Product table
    doc.moveDown().text("Produits:", { underline: true });
    let total = 0;
    mouvements.forEach(
      (m: { montant: number; quantite: number; produitNom: any }) => {
        const prixUnitaire = m.montant / m.quantite;
        const tva = m.montant * 0.2;
        total += m.montant;
        doc.text(
          `Produit: ${m.produitNom}, PU: ${prixUnitaire.toFixed(2)}, Qte: ${m.quantite}, Total: ${m.montant.toFixed(2)}, TVA: ${tva.toFixed(2)}`,
        );
      },
    );

    // Fourth line - Totals
    const totalTVA = total * 0.2;
    const totalReduction = 0; // Placeholder
    const net = total + totalTVA - totalReduction;
    doc.moveDown();
    doc
      .text("Notes:", 30)
      .text("Montants:", 350)
      .text(`Total HT: ${total.toFixed(2)}`, 350)
      .text(`Total TVA: ${totalTVA.toFixed(2)}`, 350)
      .text(`Réduction: ${totalReduction.toFixed(2)}`, 350)
      .text(`Net à payer: ${net.toFixed(2)}`, 350);

    doc.end();
  } catch (err) {
    res
      .status(500)
      .json({ message: "Erreur lors de la génération du PDF", error: err });
  }
};
