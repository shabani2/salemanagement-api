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
    const {
      organisation,
      user,
      mouvements,
      type,
      destinateur,
      serie,
      pointVente,
    } = req.body;

    const doc = new PDFDocument({
      margin: 20, // Réduit la marge pour un design plus compact
      font: "Helvetica", // Spécifiez une police par défaut
    });
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
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${docType}.pdf`,
      );
      res.send(result);
    });

    // En-tête du document (Logo et Infos Organisation)
    // Utilisez une fonction pour simplifier l'ajout d'images et de texte
    const drawHeader = () => {
      try {
        doc.image(logoPath, 20, 20, { fit: [80, 80] }); // Logo à gauche
      } catch (error) {
        console.error("Error loading logo:", error);
        // Gérez l'erreur si le logo ne peut pas être chargé.  Peut-être afficher un placeholder.
        doc.text("Logo", 20, 20); // Placeholder si le logo ne se charge pas
      }

      doc
        .fontSize(10)
        .text(organisation.nom, 100, 30, { align: "left" }) // Aligné à gauche, à côté du logo
        .text(organisation.adresse, 100, 45, { align: "left" })
        .text(organisation.email, 100, 60, { align: "left" })
        .text(organisation.siege, 100, 75, { align: "left" })
        .text(organisation.pays, 100, 90, { align: "left" });
    };

    drawHeader(); // Appelle la fonction pour dessiner l'en-tête

    // Infos sur le document (Type, Date, Série, ID Utilisateur)
    doc.moveDown(6); // Espacement plus grand après l'en-tête
    doc.fontSize(10).text(docType, { align: "right" });
    doc.text(`Date: ${format(new Date(), "dd/MM/yyyy")}`, { align: "right" }); // Format de date plus convivial
    doc.text(`Série: ${serie}`, { align: "right" });
    doc.text(`ID Utilisateur: ${user.id}`, { align: "right" });

    // Utilisateur et Destinataire
    doc.moveDown(2);
    doc.fontSize(10);
    doc.text(`Utilisateur: ${user.nom}`, 20, doc.y); // Plus près du bord gauche
    doc.text(`Adresse: ${user.adresse}`, 20, doc.y + 15);

    if (destinateur) {
      doc.text(`Destinataire: ${destinateur.nom}`, 300, doc.y - 15); // Aligné à droite
      doc.text(`Adresse: ${destinateur.adresse}`, 300, doc.y);
    }

    if (type === "Commande" && pointVente) {
      doc.text(`Point de Vente: ${pointVente.nom}`, 20, doc.y + 30);
      doc.text(`Adresse Point de Vente: ${pointVente.adresse}`, 20, doc.y + 45);
    }

    doc.moveDown(2);

    // Détail des Produits - En-tête de la table
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Détail des Produits", 20, doc.y, {
        underline: true,
        align: "left",
      }); // Aligné à gauche
    doc.moveDown(0.5);

    // Table
    const tableTop = doc.y;
    const itemSpacing = 20;
    const xStart = 20; // Définir le début de la colonne X

    doc.fontSize(10);

    // Définir les positions des colonnes
    const nomProduitX = xStart;
    const prixUnitaireX = xStart + 150;
    const quantiteX = xStart + 300;
    const montantX = xStart + 450;

    // Largeurs de colonnes (facultatif, mais utile pour l'alignement)
    const nomProduitWidth = 140;
    const prixUnitaireWidth = 100;
    const quantiteWidth = 80;
    const montantWidth = 100;

    // Dessiner l'en-tête de la table
    doc.text("Nom Produit", nomProduitX, tableTop, {
      width: nomProduitWidth,
      align: "left",
    });
    doc.text("Prix Unitaire", prixUnitaireX, tableTop, {
      width: prixUnitaireWidth,
      align: "left",
    });
    doc.text("Quantité", quantiteX, tableTop, {
      width: quantiteWidth,
      align: "left",
    });
    doc.text("Montant", montantX, tableTop, {
      width: montantWidth,
      align: "left",
    });

    doc
      .moveTo(xStart, tableTop - 2)
      .lineTo(xStart + 530, tableTop - 2)
      .stroke(); // Ajuster la longueur de la ligne
    doc
      .moveTo(xStart, tableTop + 15)
      .lineTo(xStart + 530, tableTop + 15)
      .stroke();

    let y = tableTop + itemSpacing;
    let total = 0;

    mouvements.forEach((m: Mouvement) => {
      const prixUnitaire = m.montant / m.quantite;
      total += m.montant;

      doc.text(m.produitNom, nomProduitX, y, {
        width: nomProduitWidth,
        align: "left",
      });
      doc.text(prixUnitaire.toFixed(2), prixUnitaireX, y, {
        width: prixUnitaireWidth,
        align: "left",
      });
      doc.text(m.quantite.toString(), quantiteX, y, {
        width: quantiteWidth,
        align: "left",
      });
      doc.text(m.montant.toFixed(2), montantX, y, {
        width: montantWidth,
        align: "left",
      });

      doc
        .moveTo(xStart, y + 15)
        .lineTo(xStart + 530, y + 15)
        .stroke();
      y += itemSpacing;
    });

    // Totaux
    doc.moveDown(2);
    doc.font("Helvetica-Bold");
    doc.text("Sous-total HT:", 300, y + 10, { continued: true, align: "left" });
    doc.text(`${total.toFixed(2)} FC`, 400, y + 10, { align: "left" });

    if (showTVA) {
      const totalTVA = total * 0.2;
      const net = total + totalTVA;

      doc.text("TVA (20%):", 300, y + 30, { continued: true, align: "left" });
      doc.text(`${totalTVA.toFixed(2)} FC`, 400, y + 30, { align: "left" });

      doc.text("Net à payer:", 300, y + 50, { continued: true, align: "left" });
      doc.text(`${net.toFixed(2)} FC`, 400, y + 50, { align: "left" });
    } else {
      doc.text("Montant à payer:", 300, y + 30, {
        continued: true,
        align: "left",
      });
      doc.text(`${total.toFixed(2)} FC`, 400, y + 30, { align: "left" });
    }

    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err); // Log l'erreur pour le débogage
    res
      .status(500)
      .json({ message: "Erreur lors de la génération du PDF", error: err });
  }
};
