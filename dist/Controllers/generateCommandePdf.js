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
exports.renderCommandePdf = renderCommandePdf;
// src/controllers/pdfGenerator.ts
const date_fns_1 = require("date-fns");
const pdfkit_1 = __importDefault(require("pdfkit"));
const path_1 = __importDefault(require("path"));
const logoPath = path_1.default.join(__dirname, "./../assets/default/inaf.png");
const pageFormat = "A4";
/* ---------- utilitaires communs ---------- */
const mm = (v) => v * 2.83464567;
const dotLine = (doc, x1, y, x2, color = "#e0e0e0") => {
  doc
    .moveTo(x1, y)
    .lineTo(x2, y)
    .strokeColor(color)
    .stroke()
    .strokeColor("black");
};
const kvLine = (doc, label, value, x, width, font, fontSize, gap = 4) => {
  doc.font(font).fontSize(fontSize);
  const labelW = doc.widthOfString(label);
  const valueW = doc.widthOfString(value);
  const dotW = doc.widthOfString(".");
  const dotsCount = Math.max(
    0,
    Math.floor((width - labelW - valueW - gap * 2) / dotW),
  );
  const dots = ".".repeat(dotsCount);
  const y = doc.y;
  doc.text(label, x, y, { continued: true });
  doc.text(` ${dots} `, { continued: true });
  doc.text(value, x, y, { width, align: "right" });
};
const ensureSpace = (doc, needed, margins, isPOS) => {
  const pageBottom = doc.page.height - margins;
  if (doc.y + needed > pageBottom && !isPOS) doc.addPage();
};
function resolvePage(formatName, itemsCount = 0) {
  const f = (formatName || "pos80").toLowerCase();
  if (f === "pos58") {
    const width = mm(58);
    const height = Math.max(1200, 260 + itemsCount * 32 + 160);
    return {
      size: [width, height],
      margins: 10,
      isPOS: true,
    };
  }
  if (f === "pos80") {
    const width = mm(80);
    const height = Math.max(1600, 300 + itemsCount * 34 + 180);
    return {
      size: [width, height],
      margins: 12,
      isPOS: true,
    };
  }
  if (f === "a5") return { size: "A5", margins: 24, isPOS: false };
  return { size: "A4", margins: 28, isPOS: false };
}
/* ------------------------------ RENDER PDF ------------------------------ */
function renderCommandePdf(res_1, payload_1) {
  return __awaiter(
    this,
    arguments,
    void 0,
    function* (res, payload, options = {}) {
      var _a, _b, _c, _d;
      const { organisation, format = "pos80" } = options;
      const commande = payload;
      const produits = Array.isArray(
        commande === null || commande === void 0 ? void 0 : commande.produits,
      )
        ? commande.produits
        : [];
      const itemsCount = produits.length;
      const { size, margins, isPOS } = resolvePage(format, itemsCount);
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
          `attachment; filename=Bon_de_commande.pdf`,
        );
        res.send(result);
      });
      // Styles
      const FS = {
        h1: isPOS ? 11 : 16,
        bold: isPOS ? 8.5 : 10.5,
        body: isPOS ? 8 : 9.5,
        small: isPOS ? 7.2 : 8.5,
      };
      const GAP = {
        block: isPOS ? 10 : 14,
        sub: isPOS ? 6 : 8,
        line: isPOS ? 4 : 6,
      };
      const pageWidth = doc.page.width - margins * 2;
      const x0 = margins;
      let y = margins;
      /* ------------------------------ HEADER ------------------------------ */
      try {
        doc.image(logoPath, x0, y, { fit: isPOS ? [34, 34] : [70, 70] });
      } catch (_e) {}
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
      const infosOrg = [
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
      infosOrg.forEach((ln) => {
        doc.text(ln, orgX, oy, { width: pageWidth - (orgX - x0) });
        oy = doc.y;
      });
      doc.fillColor("black");
      y = Math.max(y, oy) + GAP.block;
      // Titre + méta
      doc
        .font("Helvetica-Bold")
        .fontSize(FS.h1)
        .fillColor("#003366")
        .text("Bon de commande", x0, y, { width: pageWidth, align: "center" })
        .fillColor("black");
      y = doc.y + GAP.sub;
      doc.y = y;
      kvLine(
        doc,
        "N° commande",
        String(
          (commande === null || commande === void 0
            ? void 0
            : commande.numero) || "—",
        ),
        x0,
        pageWidth,
        "Helvetica",
        FS.body,
      );
      doc.y += GAP.line;
      kvLine(
        doc,
        "Date",
        (0, date_fns_1.format)(
          new Date(
            (commande === null || commande === void 0
              ? void 0
              : commande.createdAt) || Date.now(),
          ),
          "dd/MM/yyyy HH:mm",
        ),
        x0,
        pageWidth,
        "Helvetica",
        FS.body,
      );
      doc.y += GAP.line;
      kvLine(
        doc,
        "Statut",
        String(
          (commande === null || commande === void 0
            ? void 0
            : commande.statut) || "attente",
        ),
        x0,
        pageWidth,
        "Helvetica",
        FS.body,
      );
      doc.y += GAP.line;
      kvLine(
        doc,
        "Utilisateur",
        String(
          ((_a =
            commande === null || commande === void 0
              ? void 0
              : commande.user) === null || _a === void 0
            ? void 0
            : _a.nom) ||
            ((_b =
              commande === null || commande === void 0
                ? void 0
                : commande.user) === null || _b === void 0
              ? void 0
              : _b._id) ||
            "—",
        ),
        x0,
        pageWidth,
        "Helvetica",
        FS.body,
      );
      doc.y += GAP.line;
      // Destination (region / pointVente / dépôt central)
      if (
        (_c =
          commande === null || commande === void 0
            ? void 0
            : commande.pointVente) === null || _c === void 0
          ? void 0
          : _c.nom
      ) {
        kvLine(
          doc,
          "Point de vente",
          String(commande.pointVente.nom),
          x0,
          pageWidth,
          "Helvetica",
          FS.body,
        );
        doc.y += GAP.line;
      } else if (
        (_d =
          commande === null || commande === void 0
            ? void 0
            : commande.region) === null || _d === void 0
          ? void 0
          : _d.nom
      ) {
        kvLine(
          doc,
          "Région",
          String(commande.region.nom),
          x0,
          pageWidth,
          "Helvetica",
          FS.body,
        );
        doc.y += GAP.line;
      }
      if (
        (commande === null || commande === void 0
          ? void 0
          : commande.depotCentral) === true
      ) {
        kvLine(
          doc,
          "Dépôt central",
          "Oui",
          x0,
          pageWidth,
          "Helvetica",
          FS.body,
        );
        doc.y += GAP.line;
      }
      dotLine(doc, x0, doc.y + GAP.sub, x0 + pageWidth, "#003366");
      doc.moveDown(1.2);
      /* ------------------------------ ARTICLES ------------------------------ */
      ensureSpace(doc, 80, margins, isPOS);
      doc
        .font("Helvetica-Bold")
        .fontSize(FS.bold)
        .fillColor("#003366")
        .text("Articles", x0, doc.y);
      doc.fillColor("black");
      doc.moveDown(0.5);
      dotLine(doc, x0, doc.y, x0 + pageWidth, "#e0e0e0");
      doc.moveDown(0.3);
      const leftW = Math.floor(pageWidth * 0.6);
      const rightW = pageWidth - leftW;
      // entêtes compacts
      doc.font("Helvetica").fontSize(FS.small).fillColor("#666");
      doc.text("Désignation", x0, doc.y, { width: leftW });
      doc.text("Qté", x0 + leftW, doc.y, { width: rightW, align: "right" });
      doc.fillColor("black");
      doc.moveDown(0.3);
      dotLine(doc, x0, doc.y, x0 + pageWidth, "#f0f0f0");
      doc.moveDown(0.4);
      let totalLignes = 0;
      let totalQuantites = 0;
      doc.font("Helvetica").fontSize(FS.body);
      for (const cp of produits) {
        ensureSpace(doc, 24, margins, isPOS);
        const p = cp === null || cp === void 0 ? void 0 : cp.produit;
        const nom = (p === null || p === void 0 ? void 0 : p.nom) || "—";
        const qte = Number(
          (cp === null || cp === void 0 ? void 0 : cp.quantite) || 0,
        );
        const statut = String(
          (cp === null || cp === void 0 ? void 0 : cp.statut) || "attente",
        );
        // Ligne 1 : nom + quantité (droite)
        doc.font("Helvetica-Bold").text(nom, x0, doc.y, { width: leftW });
        doc
          .font("Helvetica")
          .text(String(qte), x0 + leftW, doc.y, {
            width: rightW,
            align: "right",
          });
        // Ligne 2 : statut
        doc.font("Helvetica").fontSize(FS.small).fillColor("#555");
        doc.text(`Statut: ${statut}`, x0, doc.y, { width: leftW });
        doc.fillColor("black");
        doc.moveDown(0.3);
        dotLine(doc, x0, doc.y, x0 + pageWidth, "#f6f6f6");
        doc.moveDown(0.5);
        totalLignes += 1;
        totalQuantites += qte;
      }
      /* ------------------------------- TOTAUX ------------------------------- */
      ensureSpace(doc, 70, margins, isPOS);
      doc
        .font("Helvetica-Bold")
        .fontSize(FS.bold)
        .fillColor("#003366")
        .text("Totaux", x0, doc.y);
      doc.fillColor("black");
      doc.moveDown(0.4);
      dotLine(doc, x0, doc.y, x0 + pageWidth, "#003366");
      doc.moveDown(0.6);
      kvLine(
        doc,
        "Nombre de lignes",
        String(totalLignes),
        x0,
        pageWidth,
        "Helvetica",
        FS.body,
      );
      doc.y += GAP.line;
      kvLine(
        doc,
        "Quantité totale",
        String(totalQuantites),
        x0,
        pageWidth,
        "Helvetica-Bold",
        FS.body,
      );
      doc.y += GAP.line;
      /* ------------------------------- NOTES -------------------------------- */
      if (commande === null || commande === void 0 ? void 0 : commande.notes) {
        doc.moveDown(0.8);
        ensureSpace(doc, 80, margins, isPOS);
        doc
          .font("Helvetica-Bold")
          .fontSize(FS.bold)
          .fillColor("#003366")
          .text("Notes", x0, doc.y);
        doc.fillColor("black");
        doc.moveDown(0.4);
        dotLine(doc, x0, doc.y, x0 + pageWidth, "#e0e0e0");
        doc.moveDown(0.6);
        doc
          .font("Helvetica")
          .fontSize(FS.body)
          .fillColor("#333")
          .text(String(commande.notes), x0, doc.y, {
            width: pageWidth,
          });
        doc.fillColor("black");
      }
      /* ------------------------------- FOOTER ------------------------------- */
      //   doc.moveDown(1.0);
      //   dotLine(doc, x0, doc.y, x0 + pageWidth, "#dcdcdc");
      //   doc.moveDown(0.6);
      //   doc.font("Helvetica").fontSize(FS.small).fillColor("#666").text("Merci pour votre confiance.", x0, doc.y, {
      //     width: pageWidth,
      //     align: "center",
      //   });
      //   doc.moveDown(0.2);
      //   doc.text("Conservez ce document pour suivi. Conditions et retours disponibles sur demande.", x0, doc.y, {
      //     width: pageWidth,
      //     align: "center",
      //   });
      //   doc.fillColor("black");
      // Signatures (A4/A5)
      if (!isPOS) {
        ensureSpace(doc, 40, margins, isPOS);
        doc.moveDown(1);
        doc.font("Helvetica").fontSize(FS.small);
        doc.text("Signature émetteur :", x0, doc.y + 10);
        doc.text("Signature réception :", x0 + pageWidth / 2, doc.y);
      }
      doc.end();
    },
  );
}
