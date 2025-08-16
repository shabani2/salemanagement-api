// controllers/stockController.ts
import { Request, Response } from "express";
import mongoose, { PipelineStage, Types } from "mongoose";
import { Stock } from "../Models/model";

/* ------------------------------ Utils parsing ------------------------------ */
const toObjectId = (v?: any) =>
  typeof v === "string" && Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : undefined;

const parseBool = (v: any, def = false) => {
  if (v === true || v === false) return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(s)) return true;
    if (["false", "0", "no", "n"].includes(s)) return false;
  }
  return def;
};

const parseIntSafe = (v: any, def: number) => {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
};

const sanitizeSort = (field?: string): string => {
  // autoriser seulement ces champs de tri
  const allow = new Set([
    "createdAt",
    "updatedAt",
    "quantite",
    "montant",
    "produit.nom",
    "pointVente.nom",
    "region.nom",
  ]);
  return allow.has(field || "") ? (field as string) : "createdAt";
};

const sortOrderToInt = (order?: string) => (order === "asc" ? 1 : -1);

/* ------------------------------- GET /stocks ------------------------------- */
/**
 * Query params pris en charge :
 * - page (default 1), limit (default 10)
 * - sortBy (default 'createdAt'), order ('asc'|'desc', default 'desc')
 * - q (recherche sur produit.nom, categorie.nom, pointVente.nom, region.nom)
 * - produit, pointVente, region (ObjectId)
 * - depotCentral ('true'/'false')
 * - includeTotal ('true' par défaut) : renvoie meta.total/pages/...
 * - includeRefs ('true' par défaut) : renvoie les références peuplées via $lookup
 */
export const getAllStocks = async (req: Request, res: Response) => {
  try {
    const {
      page: pageQ,
      limit: limitQ,
      sortBy: sortByQ,
      order: orderQ,
      q: qQ,
      produit: produitQ,
      pointVente: pointVenteQ,
      region: regionQ,
      depotCentral: depotCentralQ,
      includeTotal: includeTotalQ,
      includeRefs: includeRefsQ,
    } = req.query as Record<string, string | undefined>;

    const page = parseIntSafe(pageQ, 1);
    const limit = parseIntSafe(limitQ, 10);
    const skip = (page - 1) * limit;

    const sortBy = sanitizeSort(sortByQ);
    const order = sortOrderToInt(orderQ === "asc" ? "asc" : "desc");

    const includeTotal = parseBool(includeTotalQ, true);
    const includeRefs = parseBool(includeRefsQ, true);

    // Filtres de base (IDs + depotCentral)
    const match: Record<string, any> = {};
    const produitId = toObjectId(produitQ);
    const pvId = toObjectId(pointVenteQ);
    const regionId = toObjectId(regionQ);
    const depotCentral = typeof depotCentralQ !== "undefined" ? parseBool(depotCentralQ) : undefined;

    if (produitId) match.produit = produitId;
    if (pvId) match.pointVente = pvId;
    if (regionId) match.region = regionId;
    if (typeof depotCentral === "boolean") match.depotCentral = depotCentral;

    // Recherche texte (via $lookup), si q fourni
    const q = typeof qQ === "string" && qQ.trim().length ? qQ.trim() : undefined;
    const regex = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : undefined;

    // Pipeline d'agrégation
    const pipeline: PipelineStage[] = [
      { $match: match },
      // lookup produit
      {
        $lookup: {
          from: "produits",
          localField: "produit",
          foreignField: "_id",
          as: "produitDoc",
        },
      },
      { $unwind: { path: "$produitDoc", preserveNullAndEmptyArrays: true } },
      // lookup categorie du produit
      {
        $lookup: {
          from: "categories",
          localField: "produitDoc.categorie",
          foreignField: "_id",
          as: "categorieDoc",
        },
      },
      { $unwind: { path: "$categorieDoc", preserveNullAndEmptyArrays: true } },
      // lookup point de vente
      {
        $lookup: {
          from: "pointventes",
          localField: "pointVente",
          foreignField: "_id",
          as: "pointVenteDoc",
        },
      },
      { $unwind: { path: "$pointVenteDoc", preserveNullAndEmptyArrays: true } },
      // lookup region directe
      {
        $lookup: {
          from: "regions",
          localField: "region",
          foreignField: "_id",
          as: "regionDoc",
        },
      },
      { $unwind: { path: "$regionDoc", preserveNullAndEmptyArrays: true } },
      // lookup region du pointVente (optionnel pour enrichir)
      {
        $lookup: {
          from: "regions",
          localField: "pointVenteDoc.region",
          foreignField: "_id",
          as: "pvRegionDoc",
        },
      },
      { $unwind: { path: "$pvRegionDoc", preserveNullAndEmptyArrays: true } },
    ];

    // Si recherche plein-texte sur référentiels
    if (regex) {
      pipeline.push({
        $match: {
          $or: [
            { "produitDoc.nom": regex },
            { "categorieDoc.nom": regex },
            { "pointVenteDoc.nom": regex },
            { "regionDoc.nom": regex },
            { "pvRegionDoc.nom": regex },
          ],
        },
      });
    }

    // Projection : si includeRefs=false, renvoyer le document brut
    if (includeRefs) {
      pipeline.push({
        $project: {
          _id: 1,
          quantite: 1,
          montant: 1,
          depotCentral: 1,
          createdAt: 1,
          updatedAt: 1,
          produit: {
            _id: "$produitDoc._id",
            nom: "$produitDoc.nom",
            prix: "$produitDoc.prix",
            tva: "$produitDoc.tva",
            prixVente: "$produitDoc.prixVente",
            netTopay: "$produitDoc.netTopay",
            seuil: "$produitDoc.seuil",
            categorie: {
              _id: "$categorieDoc._id",
              nom: "$categorieDoc.nom",
              image: "$categorieDoc.image",
            },
          },
          pointVente: {
            _id: "$pointVenteDoc._id",
            nom: "$pointVenteDoc.nom",
            adresse: "$pointVenteDoc.adresse",
            region: {
              _id: "$pvRegionDoc._id",
              nom: "$pvRegionDoc.nom",
              ville: "$pvRegionDoc.ville",
            },
          },
          region: {
            _id: "$regionDoc._id",
            nom: "$regionDoc.nom",
            ville: "$regionDoc.ville",
          },
        },
      });
    } else {
      // Données brutes (sans refs)
      pipeline.push({
        $project: {
          _id: 1,
          quantite: 1,
          montant: 1,
          produit: 1,
          pointVente: 1,
          region: 1,
          depotCentral: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      });
    }

    // Tri
    pipeline.push({ $sort: { [sortBy]: order, _id: -1 } });

    // Facet pagination + total
    pipeline.push({
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        ...(includeTotal ? { metadata: [{ $count: "total" }] } : {}),
      },
    });

    const result = await Stock.aggregate(pipeline);
    const doc = result?.[0] || { data: [], metadata: [] };
    const data = doc.data || [];

    let total = 0;
    if (includeTotal) {
      total = doc.metadata?.[0]?.total || 0;
    }

    res.json({
      data,
      meta: {
        total,
        page,
        pages: includeTotal ? Math.ceil(total / limit) : undefined,
        limit,
        hasNext: includeTotal ? page * limit < total : undefined,
        hasPrev: includeTotal ? page > 1 : undefined,
        sortBy,
        order: order === 1 ? "asc" : "desc",
      },
    });
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};

/* ------------------------------- GET /stocks/:id --------------------------- */
export const getStockById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    const stock = await Stock.findById(id)
      .populate({
        path: "produit",
        populate: { path: "categorie", model: "Categorie" },
      })
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      })
      .populate("region");

    if (!stock) {
      res.status(404).json({ message: "Stock non trouvé" });
      return;
    }

    res.json(stock);
    return;
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};

/* -------------------------------- POST /stocks ----------------------------- */
export const createStock = async (req: Request, res: Response) => {
  try {
    const { produit, quantite, montant, pointVente, region, depotCentral } = req.body;

    const produitId = toObjectId(produit);
    const pvId = toObjectId(pointVente);
    const regionId = toObjectId(region);
    const depot = !!depotCentral;

    if (!produitId) {
      res.status(400).json({ message: "Produit invalide" });
      return;
    }

    // Au moins une localisation : PV, Région, ou Dépôt central (true)
    if (!pvId && !regionId && depot !== true) {
      res.status(400).json({
        message:
          "Un stock doit être associé à un point de vente, une région, ou être marqué comme 'dépôt central'.",
      });
      return;
    }

    const stock = new Stock({
      produit: produitId,
      quantite,
      montant,
      pointVente: pvId,
      region: regionId,
      depotCentral: depot,
    });

    await stock.save();
    res.status(201).json(stock);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

/* ------------------------------- PUT /stocks/:id --------------------------- */
export const updateStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }

    const { produit, quantite, montant, pointVente, region, depotCentral } = req.body;

    const produitId = toObjectId(produit);
    const pvId = toObjectId(pointVente);
    const regionId = toObjectId(region);
    const depot = !!depotCentral;

    if (!produitId) {
      res.status(400).json({ message: "Produit invalide" });
      return;
    }

    if (!pvId && !regionId && depot !== true) {
      res.status(400).json({
        message:
          "Un stock doit être associé à un point de vente, une région, ou être marqué comme 'dépôt central'.",
      });
      return;
    }

    const updated = await Stock.findByIdAndUpdate(
      id,
      {
        produit: produitId,
        quantite,
        montant,
        pointVente: pvId,
        region: regionId,
        depotCentral: depot,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ message: "Stock non trouvé" });
      return;
    }

    res.json(updated);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Erreur lors de la mise à jour", error: err });
  }
};

/* ------------------------------ DELETE /stocks/:id ------------------------- */
export const deleteStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID invalide" });
      return;
    }
    await Stock.findByIdAndDelete(id);
    res.json({ message: "Stock supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/* -------------------------- Vérification de stock -------------------------- */
/**
 * checkStock — logique existante conservée (PV / dépôt central).
 * Si tu souhaites supporter la "région" ici, on peut ajouter un paramètre `regionId`.
 */
export const checkStock = async (
  type: string,
  produitId: string,
  pointVenteId?: string
): Promise<number> => {
  if (!Types.ObjectId.isValid(produitId)) {
    return 0;
  }
  if (pointVenteId && !Types.ObjectId.isValid(pointVenteId)) {
    return 0;
  }

  const query: any = { produit: new Types.ObjectId(produitId) };

  if (type === "Livraison") {
    query.depotCentral = true;
  } else if (["Vente", "Commande", "Sortie"].includes(type)) {
    if (!pointVenteId) return 0;
    query.pointVente = new Types.ObjectId(pointVenteId);
  } else {
    return 0;
  }

  const stock = await Stock.findOne(query).lean();
  return stock?.quantite || 0;
};

export const checkStockHandler = async (req: Request, res: Response) => {
  const { type, produitId, quantite, pointVenteId } = req.body;

  if (!type || !produitId || quantite == null) {
    res.status(400).json({ success: false, message: "Paramètres manquants" });
    return;
  }

  try {
    const quantiteDisponible = await checkStock(type, produitId, pointVenteId);
    res.json({
      success: true,
      quantiteDisponible,
      suffisant: quantiteDisponible >= Number(quantite),
    });
    return;
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur serveur", error });
    return;
  }
};
