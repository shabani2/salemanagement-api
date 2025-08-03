"use strict";
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
exports.generateStockPdf = void 0;
const date_fns_1 = require("date-fns");
const pdfkit_1 = __importDefault(require("pdfkit"));
const path_1 = __importDefault(require("path"));
const model_1 = require("../Models/model");
const logoPath = path_1.default.join(__dirname, "./../assets/default/inaf.png");
const generateStockPdf = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
      const {
        organisation,
        user,
        mouvements,
        type,
        destinateur,
        serie,
        pointVente,
        paiement, // Ajoutez ce champ dans le body pour afficher mode et montant
        remarques, // Ajoutez ce champ pour message personnalisé
      } = req.body;
      const allProduits = yield model_1.Produit.find();
      // Générer le numéro du document (10 chiffres)
      const today = new Date();
      const datePart = (0, date_fns_1.format)(today, "yyMMdd");
      let seriePart = "0001";
      if (/^\d+$/.test(serie)) {
        seriePart = serie.slice(-4).padStart(4, "0");
      } else if (user && user.id) {
        seriePart = String(user.id).slice(-4).padStart(4, "0");
      }
      const numeroDocument = `${datePart}${seriePart}`;
      const doc = new pdfkit_1.default({ margin: 24, font: "Helvetica" });
      const chunks = [];
      const typeMap = {
        Entrée: "Bon d'entrée",
        Sortie: "Bon de sortie",
        Livraison: "Bon de livraison",
        Vente: "Facture",
        Commande: "Bon de commande",
      };
      const docType = typeMap[type] || "Document";
      const showTVA = !(type === "Livraison" || type === "Entree");
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const result = Buffer.concat(chunks);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${docType}.pdf`,
        );
        res.send(result);
      });
      // --- En-tête moderne ---
      const drawHeader = () => {
        var _a, _b;
        try {
          doc.image(logoPath, 24, 24, { fit: [70, 70] });
        } catch (_c) {
          doc.fontSize(8).text("Logo", 24, 24);
        }
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .text(organisation.nom, 110, 28, { align: "left" })
          .fontSize(8)
          .font("Helvetica")
          .text(`RCCM : ${organisation.rccm}`, 110, 46)
          .text(`Contact : ${organisation.contact}`, 110, 60)
          .text(`Adresse : ${organisation.siegeSocial}`, 110, 74)
          .text(`Pays : ${organisation.pays}`, 110, 88);
        // Bloc informations fiscales
        if (organisation.idNat || organisation.numeroImpot) {
          doc
            .rect(350, 24, 200, 40)
            .fillAndStroke("#f5f5f5", "#cccccc")
            .fillColor("#333")
            .fontSize(8)
            .text(
              `idNat : ${(_a = organisation.idNat) !== null && _a !== void 0 ? _a : "-"}`,
              360,
              28,
            )
            .text(
              `TVA : ${(_b = organisation.numeroImpot) !== null && _b !== void 0 ? _b : "-"}`,
              360,
              42,
            )
            .fillColor("black");
        }
      };
      drawHeader();
      doc.moveDown(3);
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#003366")
        .text(docType, { align: "right" })
        .fillColor("black")
        .font("Helvetica")
        .fontSize(9);
      doc.text(
        `Date : ${(0, date_fns_1.format)(new Date(), "dd/MM/yyyy HH:mm")}`,
        {
          align: "right",
        },
      );
      doc.text(`Série : ${serie}`, { align: "right" });
      // ... après docType, date et série
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#003366")
        .text(`Numéro : ${numeroDocument}`, { align: "right" })
        .fillColor("black")
        .font("Helvetica")
        .fontSize(9);
      doc.text(`ID Utilisateur : ${user.id}`, { align: "right" });
      // --- Bloc informations client/destinataire ---
      doc.moveDown(1.5);
      doc.font("Helvetica-Bold").text("Émetteur :", 24, doc.y);
      doc.font("Helvetica").fontSize(9);
      doc.text(`${user.nom}`, 24);
      doc.text(
        `${(_a = user.adresse) !== null && _a !== void 0 ? _a : ""}`,
        24,
      );
      if (destinateur) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").text("Destinataire :", 300, doc.y - 30);
        doc.font("Helvetica").fontSize(9);
        doc.text(`${destinateur.nom}`, 300);
        doc.text(
          `${(_b = destinateur.adresse) !== null && _b !== void 0 ? _b : ""}`,
          300,
        );
      }
      if (type === "Commande" && pointVente) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").text("Point de Vente :", 24);
        doc.font("Helvetica").fontSize(9);
        doc.text(`${pointVente.nom}`, 24);
        doc.text(
          `${(_c = pointVente.adresse) !== null && _c !== void 0 ? _c : ""}`,
          24,
        );
      }
      // --- Tableau des produits ---
      doc.moveDown(1.5);
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Détail des Produits", 24, doc.y, {
          underline: true,
          align: "left",
        });
      doc.moveDown(0.5);
      const tableTop = doc.y;
      const itemSpacing = 20;
      const xStart = 24;
      doc.fontSize(8).font("Helvetica");
      const pageWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colCount = showTVA ? 7 : 4;
      const colWidth = pageWidth / colCount;
      const [
        nomProduitX,
        prixUnitaireX,
        quantiteX,
        montantX,
        margeX,
        tvaX,
        ttcX,
      ] = Array.from({ length: colCount }, (_, i) => xStart + i * colWidth);
      doc
        .font("Helvetica-Bold")
        .text("Nom Produit", nomProduitX, tableTop, { width: colWidth })
        .text("Prix Unitaire", prixUnitaireX, tableTop, { width: colWidth })
        .text("Quantité", quantiteX, tableTop, { width: colWidth })
        .text("Montant", montantX, tableTop, { width: colWidth });
      if (showTVA) {
        doc
          .text("Marge", margeX, tableTop, { width: colWidth })
          .text("TVA", tvaX, tableTop, { width: colWidth })
          .text("TTC", ttcX, tableTop, { width: colWidth });
      }
      doc
        .moveTo(xStart, tableTop + 12)
        .lineTo(xStart + pageWidth, tableTop + 12)
        .strokeColor("#003366")
        .stroke()
        .strokeColor("black");
      let y = tableTop + itemSpacing;
      let total = 0,
        totalTVA = 0,
        totalMarge = 0,
        totalHt = 0;
      for (const m of mouvements) {
        const produit = allProduits.find(
          (p) => String(p._id) === String(m.produit),
        );
        const marge =
          (_d =
            produit === null || produit === void 0 ? void 0 : produit.marge) !==
            null && _d !== void 0
            ? _d
            : 0;
        const tva =
          (_e =
            produit === null || produit === void 0 ? void 0 : produit.tva) !==
            null && _e !== void 0
            ? _e
            : 0;
        const nomProduit =
          (produit === null || produit === void 0 ? void 0 : produit.nom) ||
          "-";
        const prixUnitaire = m.quantite ? m.montant / m.quantite : 0;
        const quantite = m.quantite;
        const montant = m.montant;
        const margeVal = (montant * marge) / 100;
        const net = montant + margeVal;
        const tvaVal = (net * tva) / 100;
        const ttc = net + tvaVal;
        doc
          .font("Helvetica")
          .text(nomProduit, nomProduitX, y, { width: colWidth })
          .text(prixUnitaire.toFixed(2), prixUnitaireX, y, { width: colWidth })
          .text(quantite.toString(), quantiteX, y, { width: colWidth })
          .text(montant.toFixed(2), montantX, y, { width: colWidth });
        if (showTVA) {
          doc
            .text(margeVal.toFixed(2), margeX, y, { width: colWidth })
            .text(tvaVal.toFixed(2), tvaX, y, { width: colWidth })
            .text(ttc.toFixed(2), ttcX, y, { width: colWidth });
          totalHt += montant;
          totalMarge += margeVal;
          totalTVA += tvaVal;
          total += ttc;
        } else {
          total += montant;
        }
        doc
          .moveTo(xStart, y + 15)
          .lineTo(xStart + pageWidth, y + 15)
          .strokeColor("#e0e0e0")
          .stroke()
          .strokeColor("black");
        y += itemSpacing;
      }
      // --- Résumé financier ---
      doc.moveDown(2);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Résumé Financier", 24, y + 10, { underline: true });
      let resumeY = y + 30;
      doc.font("Helvetica").fontSize(8);
      doc.text("Sous-total HT :", 24, resumeY, { continued: true });
      doc.text(`${totalHt.toFixed(2)} FC`, 120, resumeY);
      if (showTVA) {
        doc.text("Total Marge :", 24, resumeY + 15, { continued: true });
        doc.text(`${totalMarge.toFixed(2)} FC`, 120, resumeY + 15);
        doc.text("Total TVA :", 24, resumeY + 30, { continued: true });
        doc.text(`${totalTVA.toFixed(2)} FC`, 120, resumeY + 30);
        doc
          .font("Helvetica-Bold")
          .text("Montant TTC :", 24, resumeY + 45, { continued: true });
        doc.text(`${total.toFixed(2)} FC`, 120, resumeY + 45);
      } else {
        doc
          .font("Helvetica-Bold")
          .text("Montant à payer :", 24, resumeY + 15, { continued: true });
        doc.text(`${total.toFixed(2)} FC`, 120, resumeY + 15);
      }
      // --- Bloc paiement ---
      if (paiement) {
        doc.moveDown(1.5);
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .text("Paiement", 24, doc.y, { underline: true });
        doc.font("Helvetica").fontSize(8);
        doc.text(`Mode : ${paiement.mode}`, 24);
        doc.text(`Montant payé : ${paiement.montant.toFixed(2)} FC`, 24);
      }
      // --- Bloc remarques/messages personnalisés ---
      if (remarques) {
        doc.moveDown(1.5);
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .text("Remarques", 24, doc.y, { underline: true });
        doc.font("Helvetica").fontSize(8);
        doc.text(remarques, 24);
      }
      // // --- Mentions légales et CGV ---
      // doc.moveDown(2);
      // doc
      //   .font("Helvetica")
      //   .fontSize(7)
      //   .fillColor("#666")
      //   .text(
      //     "Conditions générales de vente et politique de retour disponibles sur demande. Pour toute réclamation, contactez le service client. Ce document fait office de preuve d’achat. Merci pour votre confiance.",
      //     { align: "center" },
      //   )
      //   .fillColor("black");
      // --- Zone signature (optionnelle) ---
      doc.moveDown(2);
      doc
        .font("Helvetica")
        .fontSize(8)
        .text("Signature vendeur :", 24, doc.y + 8)
        .text("Signature client :", 300, doc.y);
      // --- QR code ou code-barres (optionnel, nécessite une lib externe) ---
      // Vous pouvez intégrer un QR code ici avec une lib comme 'qr-image' ou 'bwip-js'
      doc.end();
    } catch (err) {
      console.error("PDF generation error:", err);
      res
        .status(500)
        .json({ message: "Erreur lors de la génération du PDF", error: err });
    }
  });
exports.generateStockPdf = generateStockPdf;
