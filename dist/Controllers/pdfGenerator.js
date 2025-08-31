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
/* ------------------------------- Helpers ------------------------------- */
const mm = (v) => v * 2.83464567; // mm -> pt
const money = (n, currency = "FC") =>
  `${(Number(n) || 0).toFixed(2)} ${currency}`;
const sanitizeKey = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
const dotLine = (doc, x1, y, x2, color = "#e0e0e0") => {
  doc
    .moveTo(x1, y)
    .lineTo(x2, y)
    .strokeColor(color)
    .stroke()
    .strokeColor("black");
};
const ensureSpace = (doc, needed, margins, isPOS) => {
  // Pour A4/A5: ajoute une page si on manque de place. Pour POS:
  // on a une grande hauteur prédéfinie, donc peu probable d’en manquer.
  const pageBottom = doc.page.height - margins;
  if (doc.y + needed > pageBottom && !isPOS) {
    doc.addPage();
  }
};
const kvLine = (doc, label, value, x, width, styles, gap = 4) => {
  doc.font(styles.font).fontSize(styles.fontSize);
  if (styles.color) doc.fillColor(styles.color);
  const labelWidth = doc.widthOfString(label);
  const valueWidth = doc.widthOfString(value);
  const dotWidth = doc.widthOfString(".");
  const dotsCount = Math.max(
    0,
    Math.floor((width - labelWidth - valueWidth - gap * 2) / dotWidth),
  );
  const dots = ".".repeat(dotsCount);
  const y = doc.y;
  doc.text(label, x, y, { continued: true });
  doc.text(` ${dots} `, { continued: true });
  doc.text(value, x, y, { width, align: "right" });
  if (styles.color) doc.fillColor("black");
};
/* --------------------------- Page/format config -------------------------- */
function resolvePage(formatName, itemsCount = 0, extraLines = 6) {
  const f = (formatName || "pos80").toLowerCase();
  // Hauteurs très généreuses en POS pour éviter toute coupe (aération)
  if (f === "pos58") {
    const width = mm(58);
    const height = Math.max(1200, 260 + itemsCount * 32 + extraLines * 26); // large marge
    return {
      size: [width, height],
      margins: 10,
      isPOS: true,
    };
  }
  if (f === "pos80") {
    const width = mm(80);
    const height = Math.max(1600, 300 + itemsCount * 34 + extraLines * 28);
    return {
      size: [width, height],
      margins: 12,
      isPOS: true,
    };
  }
  if (f === "a5") return { size: "A5", margins: 24, isPOS: false };
  return { size: "A4", margins: 28, isPOS: false };
}
/* --------------------------------- Main --------------------------------- */
const generateStockPdf = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const {
        organisation,
        user,
        mouvements,
        type,
        destinateur,
        serie,
        pointVente,
        paiement,
        remarques,
        format: wantedFormat,
        currencySymbol,
      } = req.body;
      const CURRENCY = currencySymbol || "FC";
      const allProduits = yield model_1.Produit.find();
      // Numéro doc
      const datePart = (0, date_fns_1.format)(new Date(), "yyMMdd");
      const seriePart = /^\d+$/.test(serie)
        ? serie.slice(-4).padStart(4, "0")
        : String(
            (user === null || user === void 0 ? void 0 : user.id) || "0000",
          )
            .slice(-4)
            .padStart(4, "0");
      const numeroDocument = `${datePart}${seriePart}`;
      // Type & TVA
      const typeMap = {
        entree: "Bon d'entrée",
        entrée: "Bon d'entrée",
        sortie: "Bon de sortie",
        livraison: "Bon de livraison",
        vente: "Facture",
        commande: "Bon de commande",
      };
      const key = sanitizeKey(type);
      const docType = typeMap[key] || "Document";
      const showTVA = key === "vente" || key === "sortie" || key === "commande";
      const { size, margins, isPOS } = resolvePage(
        wantedFormat,
        (mouvements === null || mouvements === void 0
          ? void 0
          : mouvements.length) || 0,
      );
      const doc = new pdfkit_1.default({
        size,
        margin: margins,
        bufferPages: true,
      });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => {
        const result = Buffer.concat(chunks);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${docType}.pdf`,
        );
        res.send(result);
      });
      // Styles (gras plus petit, corps lisible, espaces clairs)
      const FS = {
        h1: isPOS ? 11 : 16,
        bold: isPOS ? 8.5 : 10.5,
        body: isPOS ? 8 : 9.5,
        small: isPOS ? 7.2 : 8.5,
        label: isPOS ? 8 : 9.5,
      };
      const GAP = {
        block: isPOS ? 10 : 14,
        subBlock: isPOS ? 6 : 8,
        line: isPOS ? 4 : 6,
      };
      const pageWidth = doc.page.width - margins * 2;
      const x0 = margins;
      let y = margins;
      /* ------------------------------- HEADER ------------------------------- */
      // Logo
      try {
        doc.image(logoPath, x0, y, { fit: isPOS ? [34, 34] : [70, 70] });
      } catch (_a) {
        // ignore
      }
      // Raison sociale + coordonnées (alignés, aérés)
      const orgX = isPOS ? x0 + 42 : x0 + 82;
      doc
        .font("Helvetica-Bold")
        .fontSize(FS.bold)
        .text(
          (organisation === null || organisation === void 0
            ? void 0
            : organisation.nom) || "—",
          orgX,
          y,
          {
            width: pageWidth - (orgX - x0),
          },
        );
      doc.font("Helvetica").fontSize(FS.small).fillColor("#444");
      const orgLines = [
        (
          organisation === null || organisation === void 0
            ? void 0
            : organisation.rccm
        )
          ? `RCCM : ${organisation.rccm}`
          : "",
        (
          organisation === null || organisation === void 0
            ? void 0
            : organisation.contact
        )
          ? `Contact : ${organisation.contact}`
          : "",
        (
          organisation === null || organisation === void 0
            ? void 0
            : organisation.siegeSocial
        )
          ? `Adresse : ${organisation.siegeSocial}`
          : "",
        (
          organisation === null || organisation === void 0
            ? void 0
            : organisation.pays
        )
          ? `Pays : ${organisation.pays}`
          : "",
      ].filter(Boolean);
      let oy = doc.y + 2;
      orgLines.forEach((ln) => {
        doc.text(ln, orgX, oy, { width: pageWidth - (orgX - x0) });
        oy = doc.y;
      });
      doc.fillColor("black");
      // Bloc fiscal (compact + espacé)
      if (
        (organisation === null || organisation === void 0
          ? void 0
          : organisation.idNat) ||
        (organisation === null || organisation === void 0
          ? void 0
          : organisation.numeroImpot)
      ) {
        const bx = x0;
        const bw = pageWidth;
        const by = Math.max(y, oy) + GAP.subBlock;
        doc
          .roundedRect(bx, by, bw, isPOS ? 26 : 36, 4)
          .fillAndStroke("#f7f7f7", "#d9d9d9");
        doc.fillColor("#333").fontSize(FS.small);
        let ty = by + (isPOS ? 4 : 6);
        if (
          organisation === null || organisation === void 0
            ? void 0
            : organisation.idNat
        ) {
          doc.text(`idNat : ${organisation.idNat}`, bx + 8, ty);
          ty = doc.y;
        }
        if (
          organisation === null || organisation === void 0
            ? void 0
            : organisation.numeroImpot
        )
          doc.text(`TVA : ${organisation.numeroImpot}`, bx + 8, ty);
        doc.fillColor("black");
        y = by + (isPOS ? 26 : 36);
      } else {
        y = Math.max(y, oy) + GAP.block;
      }
      // Titre document
      doc
        .font("Helvetica-Bold")
        .fontSize(FS.h1)
        .fillColor("#003366")
        .text(docType, x0, y, { width: pageWidth, align: "center" })
        .fillColor("black");
      y = doc.y + GAP.subBlock;
      // Méta (dot leaders)
      doc.font("Helvetica").fontSize(FS.body);
      kvLine(
        doc,
        "Date",
        (0, date_fns_1.format)(new Date(), "dd/MM/yyyy HH:mm"),
        x0,
        pageWidth,
        {
          font: "Helvetica",
          fontSize: FS.body,
        },
      );
      y = doc.y + GAP.line;
      doc.y = y;
      kvLine(doc, "Série", String(serie || "—"), x0, pageWidth, {
        font: "Helvetica",
        fontSize: FS.body,
      });
      y = doc.y + GAP.line;
      doc.y = y;
      kvLine(doc, "N°", String(numeroDocument), x0, pageWidth, {
        font: "Helvetica",
        fontSize: FS.body,
      });
      y = doc.y + GAP.line;
      doc.y = y;
      kvLine(
        doc,
        "Utilisateur",
        String(
          (user === null || user === void 0 ? void 0 : user.nom) ||
            (user === null || user === void 0 ? void 0 : user.id) ||
            "—",
        ),
        x0,
        pageWidth,
        { font: "Helvetica", fontSize: FS.body },
      );
      y = doc.y;
      if (
        pointVente === null || pointVente === void 0 ? void 0 : pointVente.nom
      ) {
        y += GAP.line;
        doc.y = y;
        kvLine(doc, "Point de vente", String(pointVente.nom), x0, pageWidth, {
          font: "Helvetica",
          fontSize: FS.body,
        });
        y = doc.y;
      }
      if (
        destinateur === null || destinateur === void 0
          ? void 0
          : destinateur.nom
      ) {
        y += GAP.line;
        doc.y = y;
        kvLine(doc, "Destinataire", String(destinateur.nom), x0, pageWidth, {
          font: "Helvetica",
          fontSize: FS.body,
        });
        y = doc.y;
      }
      y += GAP.subBlock;
      dotLine(doc, x0, y, x0 + pageWidth, "#003366");
      y += GAP.block;
      doc.y = y;
      /* ------------------------------ ARTICLES ------------------------------ */
      ensureSpace(doc, 60, margins, isPOS);
      doc
        .font("Helvetica-Bold")
        .fontSize(FS.bold)
        .fillColor("#003366")
        .text("Articles", x0, doc.y);
      doc.fillColor("black");
      y = doc.y + GAP.subBlock;
      dotLine(doc, x0, y, x0 + pageWidth, "#e0e0e0");
      y += GAP.subBlock;
      doc.y = y;
      const leftW = Math.floor(pageWidth * 0.6);
      const rightW = pageWidth - leftW;
      // En-têtes compacts
      doc.font("Helvetica").fontSize(FS.small).fillColor("#666");
      doc.text("Désignation", x0, y, { width: leftW });
      doc.text("Total", x0 + leftW, y, { width: rightW, align: "right" });
      doc.fillColor("black");
      y = doc.y + GAP.line;
      dotLine(doc, x0, y, x0 + pageWidth, "#f0f0f0");
      y += GAP.subBlock;
      doc.y = y;
      let total = 0,
        totalTVA = 0,
        totalMarge = 0,
        totalHt = 0;
      const rowAdvance = isPOS ? 18 : 20;
      for (const m of mouvements || []) {
        ensureSpace(doc, rowAdvance + GAP.line, margins, isPOS);
        const produit = allProduits.find(
          (p) => String(p._id) === String(m.produit),
        );
        const marge = Number(
          (produit === null || produit === void 0 ? void 0 : produit.marge) ||
            0,
        );
        const tva = Number(
          (produit === null || produit === void 0 ? void 0 : produit.tva) || 0,
        );
        const nomProduit =
          (produit === null || produit === void 0 ? void 0 : produit.nom) ||
          "-";
        const qte = Number(
          (m === null || m === void 0 ? void 0 : m.quantite) || 0,
        );
        const montant = Number(
          (m === null || m === void 0 ? void 0 : m.montant) || 0,
        );
        const pu = qte > 0 ? montant / qte : 0;
        const margeVal = (montant * marge) / 100;
        const net = montant + margeVal;
        const tvaVal = (net * tva) / 100;
        const ttc = net + tvaVal;
        // Ligne nom + total
        doc.font("Helvetica-Bold").fontSize(FS.body);
        doc.text(nomProduit, x0, doc.y, { width: leftW });
        doc.text(money(showTVA ? ttc : montant, CURRENCY), x0 + leftW, y, {
          width: rightW,
          align: "right",
        });
        y = Math.max(doc.y, y);
        doc.y = y;
        // Ligne détails qty × pu, marge/tva
        const details = [`${qte} × ${money(pu, CURRENCY)}`];
        if (showTVA) {
          if (marge) details.push(`Marge ${marge}%`);
          if (tva) details.push(`TVA ${tva}%`);
        }
        doc.font("Helvetica").fontSize(FS.small).fillColor("#555");
        doc.text(details.join("  •  "), x0, y, { width: leftW });
        doc.fillColor("black");
        y = doc.y + GAP.line;
        dotLine(doc, x0, y, x0 + pageWidth, "#f6f6f6");
        y += GAP.subBlock;
        doc.y = y;
        if (showTVA) {
          totalHt += montant;
          totalMarge += margeVal;
          totalTVA += tvaVal;
          total += ttc;
        } else {
          total += montant;
        }
      }
      /* -------------------------------- TOTAX -------------------------------- */
      y += GAP.block;
      ensureSpace(doc, 80, margins, isPOS);
      doc
        .font("Helvetica-Bold")
        .fontSize(FS.bold)
        .fillColor("#003366")
        .text("Totaux", x0, y);
      doc.fillColor("black");
      y = doc.y + GAP.subBlock;
      dotLine(doc, x0, y, x0 + pageWidth, "#003366");
      y += GAP.subBlock;
      doc.y = y;
      const kv = (label, value, bold = false) => {
        ensureSpace(doc, 18, margins, isPOS);
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(FS.body);
        kvLine(doc, label, value, x0, pageWidth, {
          font: bold ? "Helvetica-Bold" : "Helvetica",
          fontSize: FS.body,
        });
        doc.y += GAP.line;
      };
      if (showTVA) {
        kv("Sous-total HT", money(totalHt, CURRENCY));
        kv("Marge totale", money(totalMarge, CURRENCY));
        kv("TVA totale", money(totalTVA, CURRENCY));
        kv("Montant TTC", money(total, CURRENCY), true);
      } else {
        kv("Montant à payer", money(total, CURRENCY), true);
      }
      /* ------------------------------- PAIEMENT ------------------------------ */
      if (paiement && (paiement.mode || paiement.montant != null)) {
        y = doc.y + GAP.block;
        ensureSpace(doc, 70, margins, isPOS);
        doc
          .font("Helvetica-Bold")
          .fontSize(FS.bold)
          .fillColor("#003366")
          .text("Paiement", x0, y);
        doc.fillColor("black");
        y = doc.y + GAP.subBlock;
        dotLine(doc, x0, y, x0 + pageWidth, "#e0e0e0");
        y += GAP.subBlock;
        doc.y = y;
        const paid = Number(paiement.montant || 0);
        const change = Math.max(0, paid - total);
        kv("Mode", String(paiement.mode || "—"));
        kv("Montant payé", money(paid, CURRENCY));
        if (paid >= total)
          kv("Monnaie à rendre", money(change, CURRENCY), true);
      }
      /* ------------------------------- REMARQUES ----------------------------- */
      if (remarques) {
        y = doc.y + GAP.block;
        ensureSpace(doc, 80, margins, isPOS);
        doc
          .font("Helvetica-Bold")
          .fontSize(FS.bold)
          .fillColor("#003366")
          .text("Remarques", x0, y);
        doc.fillColor("black");
        y = doc.y + GAP.subBlock;
        dotLine(doc, x0, y, x0 + pageWidth, "#e0e0e0");
        y += GAP.subBlock;
        doc.y = y;
        doc.font("Helvetica").fontSize(FS.body).fillColor("#333");
        doc.text(String(remarques), x0, y, { width: pageWidth });
        doc.fillColor("black");
        doc.y += GAP.subBlock;
      }
      /* -------------------------------- FOOTER ------------------------------ */
      y = doc.y + GAP.block;
      dotLine(doc, x0, y, x0 + pageWidth, "#dcdcdc");
      y += GAP.subBlock;
      doc.font("Helvetica").fontSize(FS.small).fillColor("#666");
      doc.text("Merci pour votre confiance.", x0, y, {
        width: pageWidth,
        align: "center",
      });
      y = doc.y + GAP.line;
      doc.text(
        "Conservez ce ticket comme preuve d'achat. Conditions et retours disponibles sur demande.",
        x0,
        y,
        { width: pageWidth, align: "center" },
      );
      doc.fillColor("black");
      // Signatures sur A4/A5 uniquement
      if (!isPOS) {
        y = doc.y + GAP.block;
        ensureSpace(doc, 40, margins, isPOS);
        doc.font("Helvetica").fontSize(FS.small);
        doc.text("Signature vendeur :", x0, y + 10);
        doc.text("Signature client :", x0 + pageWidth / 2, y);
      }
      doc.end();
    } catch (err) {
      console.error("PDF generation error:", err);
      res
        .status(500)
        .json({ message: "Erreur lors de la génération du PDF", error: err });
    }
  });
exports.generateStockPdf = generateStockPdf;
