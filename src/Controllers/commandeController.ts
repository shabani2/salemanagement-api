// /src/controllers/commandeController.ts
// Contrôleur Commande — complet, sans `return res(...)`, avec filtres requestedRegion/requestedPointVente/fournisseur

import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  Commande,
  CommandeProduit,
  MouvementStock,
  PointVente,
} from "../Models/model";
import { renderCommandePdf } from "./generateCommandePdf";

/**
PSEUDOCODE (plan court)
1) Helpers: HttpError, pagination, parse & build filters, unions Source/Destination, resolveRouting.
2) formatCommande(): populate produits->produit, calc montant/lignes/tauxLivraison.
3) GET: all (avec filtres query), by user, by pointVente, by region (inclut source/dest et PV rattachés), by requestedRegion, by requestedPointVente, by fournisseur, by id.
4) POST create: valider resolveRouting, créer commande + lignes, option PDF.
5) PUT update: valider routing simulé, MAJ lignes + mouvements stock si "livré", MAJ statut commande.
6) DELETE, PRINT.
Note: Aucune fonction ne fait `return res(...)` pour éviter les confusions d'overload Express.
*/

// ---------------------------------------------------------
// Types & constants
// ---------------------------------------------------------
const SOURCE = ["PV", "REGION", "CENTRAL"] as const;
type SourceType = (typeof SOURCE)[number];
const DESTINATION = ["REGION", "PV", "CENTRAL", "FOURNISSEUR"] as const;
type DestType = (typeof DESTINATION)[number];

type StatutType = "attente" | "livrée" | "annulée";
const allowedStatuts = new Set<StatutType>(["attente", "livrée", "annulée"]);

// ---------------------------------------------------------
// Utils
// ---------------------------------------------------------
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const getPaginationOptions = (req: Request) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const isValidObjectId = (id: unknown) =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
const parseBool = (v: unknown) => (typeof v === "string" ? v === "true" : !!v);

const buildCommandeFilters = (req: Request) => {
  const q = req.query as Record<string, any>;
  const filter: any = {};
  if (isValidObjectId(q.user)) filter.user = q.user;
  if (isValidObjectId(q.region)) filter.region = q.region;
  if (isValidObjectId(q.pointVente)) filter.pointVente = q.pointVente;
  if (isValidObjectId(q.requestedRegion))
    filter.requestedRegion = q.requestedRegion;
  if (isValidObjectId(q.requestedPointVente))
    filter.requestedPointVente = q.requestedPointVente;
  if (isValidObjectId(q.fournisseur)) filter.fournisseur = q.fournisseur;
  if (q.numero) filter.numero = q.numero;
  if (typeof q.depotCentral !== "undefined")
    filter.depotCentral = parseBool(q.depotCentral);
  if (q.statut && allowedStatuts.has(q.statut)) filter.statut = q.statut;
  if (q.createdFrom || q.createdTo) {
    filter.createdAt = {} as any;
    if (q.createdFrom) filter.createdAt.$gte = new Date(q.createdFrom);
    if (q.createdTo) filter.createdAt.$lte = new Date(q.createdTo);
  }
  return filter;
};

const commonPopulate = [
  { path: "user", select: "-password" },
  { path: "fournisseur", select: "-password" },
  { path: "region" },
  { path: "requestedRegion" },
  { path: "pointVente", populate: { path: "region", model: "Region" } },
  {
    path: "requestedPointVente",
    populate: { path: "region", model: "Region" },
  },
];
export function pickDefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    const v = obj[k];
    if (v !== undefined) {
      out[k] = v as T[keyof T];
    }
  }
  return out;
}

// ---------------------------------------------------------
// Routing rules
// ---------------------------------------------------------
function resolveRouting(body: any): {
  source: SourceType;
  destination: DestType;
} {
  const hasReqPV = !!body.requestedPointVente;
  const hasReqReg = !!body.requestedRegion;
  const hasFournisseur = !!body.fournisseur;
  const hasDestRegion = !!body.region;
  const hasDestPV = !!body.pointVente;
  const depotCentral = body.depotCentral === true;

  const centralAsDest = depotCentral && !hasDestRegion && !hasDestPV;
  const centralAsSource =
    depotCentral && (hasDestRegion || hasDestPV) && !hasReqPV && !hasReqReg;

  const sourceCount = [hasReqPV, hasReqReg, centralAsSource].filter(
    Boolean,
  ).length;
  const destCount = [
    hasDestRegion,
    hasDestPV,
    centralAsDest,
    hasFournisseur,
  ].filter(Boolean).length;

  if (sourceCount !== 1)
    throw new HttpError(
      400,
      "Définissez exactement une source (requestedPointVente | requestedRegion | depotCentral=true source).",
    );
  if (destCount !== 1)
    throw new HttpError(
      400,
      "Définissez exactement une destination (region | pointVente | depotCentral=true destination | fournisseur).",
    );
  if (hasFournisseur && (hasDestRegion || hasDestPV || centralAsDest))
    throw new HttpError(
      400,
      "'fournisseur' est exclusif aux destinations internes.",
    );
  if (centralAsSource && centralAsDest)
    throw new HttpError(
      400,
      "depotCentral ne peut pas être simultanément source et destination.",
    );

  const source: SourceType = hasReqPV ? "PV" : hasReqReg ? "REGION" : "CENTRAL";
  let destination: DestType;
  if (hasFournisseur) destination = "FOURNISSEUR";
  else if (hasDestRegion) destination = "REGION";
  else if (hasDestPV) destination = "PV";
  else destination = "CENTRAL";

  if (source === "PV") {
    if (
      !(["REGION", "CENTRAL", "FOURNISSEUR"] as DestType[]).includes(
        destination,
      )
    ) {
      throw new HttpError(
        400,
        "PV → seulement REGION | CENTRAL | FOURNISSEUR.",
      );
    }
    if (destination === "PV") throw new HttpError(400, "PV → PV interdit.");
  }

  if (source === "REGION") {
    if (
      !(["CENTRAL", "REGION", "PV", "FOURNISSEUR"] as DestType[]).includes(
        destination,
      )
    ) {
      throw new HttpError(
        400,
        "REGION → seulement CENTRAL | REGION | PV | FOURNISSEUR.",
      );
    }
  }

  if (source === "CENTRAL") {
    if (
      !(["REGION", "PV", "FOURNISSEUR"] as DestType[]).includes(destination)
    ) {
      throw new HttpError(
        400,
        "CENTRAL → seulement REGION | PV | FOURNISSEUR.",
      );
    }
    if (destination === "CENTRAL")
      throw new HttpError(400, "CENTRAL → CENTRAL interdit.");
  }

  if (destination !== "FOURNISSEUR") {
    if (destination === "CENTRAL" && !centralAsDest)
      throw new HttpError(
        400,
        "Pour destination CENTRAL, mettre depotCentral=true sans region/pointVente.",
      );
    if (destination === "REGION" && !hasDestRegion)
      throw new HttpError(400, "Destination région manquante.");
    if (destination === "PV" && !hasDestPV)
      throw new HttpError(400, "Destination point de vente manquante.");
  }

  return { source, destination };
}

// ---------------------------------------------------------
// Derivatives
// ---------------------------------------------------------
const formatCommande = async (commande: any) => {
  await commande.populate({
    path: "produits",
    populate: { path: "produit", model: "Produit" },
  });
  let montant = 0;
  let lignes = 0;
  let lignesLivrees = 0;
  for (const cp of commande.produits) {
    const prix = cp?.produit?.prix ?? 0;
    const quantite = cp?.quantite ?? 0;
    montant += prix * quantite;
    lignes += 1;
    if (cp?.statut === "livré") lignesLivrees += 1;
  }
  const tauxLivraison =
    lignes > 0 ? Math.round((lignesLivrees / lignes) * 100) : 0;
  return {
    ...commande.toObject(),
    montant,
    nombreCommandeProduit: lignes,
    tauxLivraison,
  };
};

// Helper: tri par défaut (pour voir les plus récentes en premier)
const applySort = (req: Request) => {
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const order = (req.query.order as string) === "asc" ? 1 : -1;
  // pourquoi: _id comme tie-breaker pour stabilité
  return sortBy === "createdAt"
    ? { createdAt: order, _id: order }
    : { [sortBy]: order, _id: -1 };
};

export const getAllCommandes = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { skip, limit } = getPaginationOptions(req);
    const filters = buildCommandeFilters(req);

    const sort = applySort(req);
    const [commandes, total] = await Promise.all([
      (Commande as any)
        .find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate as any),
      Commande.countDocuments(filters),
    ]);

    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération des commandes.",
      error: (error as Error).message,
    });
  }
};

export const getCommandesByUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { skip, limit } = getPaginationOptions(req);
    const sort = applySort(req);

    const [commandes, total] = await Promise.all([
      (Commande as any)
        .find({ user: userId })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate as any),
      Commande.countDocuments({ user: userId }),
    ]);

    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération des commandes utilisateur.",
      error: (error as Error).message,
    });
  }
};

// /src/controllers/commandeController.ts  (extraits à remplacer)

// -------------------------- Helpers de portée --------------------------
const buildQueryForPointVente = (pointVenteId: string) => ({
  $or: [
    { pointVente: pointVenteId }, // destinataire = ce PV
    { requestedPointVente: pointVenteId }, // source = ce PV
  ],
});

const buildQueryForRegion = async (regionId: string) => {
  // IDs des PV rattachés à cette région
  const pvIds: mongoose.Types.ObjectId[] = await (PointVente as any)
    .find({ region: regionId })
    .distinct("_id");

  return {
    $or: [
      { region: regionId }, // destinataire = la région
      { requestedRegion: regionId }, // source = la région
      { pointVente: { $in: pvIds } }, // destinataire = PV de la région
      { requestedPointVente: { $in: pvIds } }, // source = PV de la région
    ],
  };
};

// -------------------------- Handlers mis à jour --------------------------
export const getCommandesByPointVente = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { pointVenteId } = req.params;
    const { skip, limit } = getPaginationOptions(req);
    const sort = applySort(req);

    if (!isValidObjectId(pointVenteId)) {
      res.status(400).json({ message: "Paramètre pointVenteId invalide." });
      return;
    }

    const query = buildQueryForPointVente(pointVenteId);

    const [commandes, total] = await Promise.all([
      (Commande as any)
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate as any),
      Commande.countDocuments(query),
    ]);

    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({
      total,
      commandes: formatted,
      page: Math.floor(skip / limit) + 1,
      limit,
    });
  } catch (error) {
    res.status(400).json({
      message:
        "Erreur lors de la récupération des commandes par point de vente (source ou destination).",
      error: (error as Error).message,
    });
  }
};

export const getCommandesByRegion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { regionId } = req.params;
    const { skip, limit } = getPaginationOptions(req);
    const sort = applySort(req);

    if (!isValidObjectId(regionId)) {
      res.status(400).json({ message: "Paramètre regionId invalide." });
      return;
    }

    const query = await buildQueryForRegion(regionId);

    const [commandes, total] = await Promise.all([
      (Commande as any)
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate as any),
      Commande.countDocuments(query),
    ]);

    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({
      total,
      commandes: formatted,
      page: Math.floor(skip / limit) + 1,
      limit,
    });
  } catch (error) {
    res.status(400).json({
      message:
        "Erreur lors de la récupération des commandes par région (source ou destination).",
      error: (error as Error).message,
    });
  }
};

export const getCommandesByRequestedRegion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { requestedRegionId } = req.params as any;
    const { skip, limit } = getPaginationOptions(req);
    const sort = applySort(req);

    const [commandes, total] = await Promise.all([
      (Commande as any)
        .find({ requestedRegion: requestedRegionId })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate as any),
      Commande.countDocuments({ requestedRegion: requestedRegionId }),
    ]);

    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors des commandes par région source (requestedRegion).",
      error: (error as Error).message,
    });
  }
};

export const getCommandesByRequestedPointVente = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { requestedPointVenteId } = req.params as any;
    const { skip, limit } = getPaginationOptions(req);
    const sort = applySort(req);

    const [commandes, total] = await Promise.all([
      (Commande as any)
        .find({ requestedPointVente: requestedPointVenteId })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate as any),
      Commande.countDocuments({ requestedPointVente: requestedPointVenteId }),
    ]);

    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res.status(400).json({
      message:
        "Erreur lors des commandes par point de vente source (requestedPointVente).",
      error: (error as Error).message,
    });
  }
};

export const getCommandesByFournisseur = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { fournisseurId } = req.params as any;
    const { skip, limit } = getPaginationOptions(req);
    const sort = applySort(req);

    const [commandes, total] = await Promise.all([
      (Commande as any)
        .find({ fournisseur: fournisseurId })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate as any),
      Commande.countDocuments({ fournisseur: fournisseurId }),
    ]);

    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors des commandes par fournisseur.",
      error: (error as Error).message,
    });
  }
};

// ---------------------------------------------------------
// Handlers
// ---------------------------------------------------------

export const getCommandeById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const commande = await (Commande as any)
      .findById(id)
      .populate(commonPopulate as any)
      .populate({ path: "produits", populate: { path: "produit" } });

    if (!commande) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }

    const formatted = await formatCommande(commande);
    res.status(200).json(formatted);
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération de la commande.",
      error: (error as Error).message,
    });
  }
};

// const pickDefined = <T extends Record<string, any>>(obj: T): Partial<T> =>
//   Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const isValidProductItem = (it: any) =>
  it &&
  it.produit &&
  mongoose.Types.ObjectId.isValid(String(it.produit)) &&
  Number(it.quantite) > 0;

const assertProduitsOr400 = (
  req: Request,
  res: Response,
): { ok: true } | { ok: false } => {
  const produits = req.body?.produits;
  if (!Array.isArray(produits) || produits.length === 0) {
    res.status(400).json({
      message: "Les produits sont requis et doivent être un tableau non vide.",
    });
    return { ok: false };
  }
  if (!produits.every(isValidProductItem)) {
    res.status(400).json({
      message: "Chaque produit doit contenir { produit:ObjectId, quantite>0 }.",
    });
    return { ok: false };
  }
  return { ok: true };
};

export const createCommande = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      user,
      region,
      pointVente,
      requestedRegion,
      requestedPointVente,
      depotCentral,
      fournisseur,
      produits,
      organisation,
      print,
    } = req.body;

    const wantPdf = req.query.pdf === "1" || print === true;

    if (!user) {
      res.status(400).json({ message: "Le champ 'user' est requis." });
      return;
    }
    const pv = assertProduitsOr400(req, res);
    if (!pv.ok) return;

    // Peut muter req.body (routage dérivé selon votre logique)
    resolveRouting(req.body);

    const numero = `CMD-${Date.now()}`;
    const toCreate = pickDefined({
      numero,
      user,
      region,
      pointVente,
      requestedRegion,
      requestedPointVente,
      depotCentral: !!depotCentral,
      fournisseur,
      produits: [] as mongoose.Types.ObjectId[],
      statut: "attente" as const,
    });

    const commande = new (Commande as any)(toCreate);
    await commande.save();

    const createdCommandeProduits = await Promise.all(
      (produits as any[]).map(async (prod: any) => {
        const created = new (CommandeProduit as any)({
          commandeId: commande._id,
          produit: prod.produit,
          quantite: prod.quantite,
          statut: "attente",
        });
        await created.save();
        return created._id as mongoose.Types.ObjectId;
      }),
    );

    commande.produits = createdCommandeProduits;
    await commande.save();

    const populated = await (Commande as any)
      .findById(commande._id)
      .populate(commonPopulate as any)
      .populate({ path: "produits", populate: { path: "produit" } });

    if (!populated) {
      res.status(404).json({ message: "Commande introuvable après création." });
      return;
    }

    if (wantPdf) {
      await renderCommandePdf(res, populated, {
        organisation,
        format: (req.query.format as any) || "pos80",
      });
      return;
    }

    res.status(201).json(populated);
  } catch (error) {
    const status = (error as any)?.status || 400;
    res.status(status).json({
      message: "Erreur lors de la création de la commande.",
      error: (error as Error).message,
    });
  }
};

export const deleteCommande = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await (Commande as any).findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }
    res.status(200).json({ message: "Commande supprimée avec succès." });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la suppression.",
      error: (error as Error).message,
    });
  }
};

export const printCommande = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const format = (req.query.format as any) || "pos80";

    const commande = await (Commande as any)
      .findById(id)
      .populate(commonPopulate as any)
      .populate({ path: "produits", populate: { path: "produit" } });

    if (!commande) {
      res.status(404).json({ message: "Commande introuvable" });
      return;
    }

    const organisation = req.body?.organisation || null;
    await renderCommandePdf(res, commande, { organisation, format });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de l'impression du bon de commande.",
      error: (error as Error).message,
    });
  }
};

// ---- Helper: mapping route -> type mouvement + coordonnées ----
// Pourquoi: ne pas passer de mauvaises coordonnées au MouvementStock.
//type Route = { source: "PV" | "REGION" | "CENTRAL"; destination: "REGION" | "PV" | "CENTRAL" | "FOURNISSEUR" };
function buildMvtMetaFromRoute(route: Route, cmd: any) {
  // Livraison gérée nativement par computeLivraisonScopes:
  // - CENTRAL -> REGION/PV
  // - REGION  -> PV
  if (
    route.source === "CENTRAL" &&
    (route.destination === "REGION" || route.destination === "PV")
  ) {
    return {
      type: "Livraison" as const,
      coords: {
        depotCentral: true,
        ...(route.destination === "REGION" ? { region: cmd.region } : {}),
        ...(route.destination === "PV" ? { pointVente: cmd.pointVente } : {}),
      },
    };
  }
  if (route.source === "REGION" && route.destination === "PV") {
    return {
      type: "Livraison" as const,
      coords: {
        region: cmd.region,
        pointVente: cmd.pointVente,
      },
    };
  }

  // Tout le reste -> Sortie (décrément seulement, pas de crédit auto)
  // Exemples: PV->REGION/CENTRAL, REGION->CENTRAL, *->FOURNISSEUR, REGION->REGION...
  const coordsSource =
    route.source === "CENTRAL"
      ? { depotCentral: true }
      : route.source === "REGION"
        ? { region: cmd.requestedRegion ?? cmd.region }
        : { pointVente: cmd.requestedPointVente ?? cmd.pointVente };

  return { type: "Sortie" as const, coords: coordsSource };
}

// path: src/controllers/commandeController.ts  (UPDATE UNIQUEMENT)

type AdjustStockFilter = {
  produit: mongoose.Types.ObjectId;
  region?: mongoose.Types.ObjectId;
  pointVente?: mongoose.Types.ObjectId;
  depotCentral?: boolean;
};

/** Pourquoi: fabrique l’override inversé {source,destination} attendu par les hooks. */

type MObjId = mongoose.Types.ObjectId;

function buildLivraisonOverrideFromInvertedRoute(
  route: ReturnType<typeof resolveRouting>,
  cmd: any,
  produitId: MObjId,
): LivraisonOverride {
  const o: LivraisonOverride = {};

  // Mouvement.source = Commande.destination
  switch (route.destination) {
    case "REGION":
      if (cmd.region) o.source = { produit: produitId, region: cmd.region };
      break;
    case "PV":
      if (cmd.pointVente)
        o.source = { produit: produitId, pointVente: cmd.pointVente };
      break;
    case "CENTRAL":
      o.source = { produit: produitId, depotCentral: true };
      break;
    // "FOURNISSEUR": pas de stock pour l’instant → pas d’override.source
  }

  // Mouvement.destination = Commande.source
  switch (route.source) {
    case "REGION":
      if (cmd.requestedRegion)
        o.destination = { produit: produitId, region: cmd.requestedRegion };
      break;
    case "PV":
      if (cmd.requestedPointVente)
        o.destination = {
          produit: produitId,
          pointVente: cmd.requestedPointVente,
        };
      break;
    case "CENTRAL":
      o.destination = { produit: produitId, depotCentral: true };
      break;
  }

  return o;
}

// path: src/controllers/commandeController.ts  (remplace la fonction updateCommande + helper)

// Assumptions: resolveRouting, pickDefined, commonPopulate, formatCommande déjà définis dans ce fichier

type MId = mongoose.Types.ObjectId;

type LivraisonEnd = {
  produit: MId;
  region?: MId;
  pointVente?: MId;
  depotCentral?: boolean;
};

type LivraisonOverride = {
  source?: LivraisonEnd;
  destination?: LivraisonEnd;
};

type Route = ReturnType<typeof resolveRouting>; // { source: "PV"|"REGION"|"CENTRAL"; destination: "REGION"|"PV"|"CENTRAL"|"FOURNISSEUR" }

/** Pourquoi: fabrique l’override **inversé** attendu par les hooks (commande S→D ⇢ mouvement S’=D, D’=S). */
function buildInvertedOverride(
  route: Route,
  cmd: any,
  produitId: MId,
): LivraisonOverride {
  const o: LivraisonOverride = {};

  // Mouvement.source = Commande.destination
  switch (route.destination) {
    case "REGION":
      if (cmd.region) o.source = { produit: produitId, region: cmd.region };
      break;
    case "PV":
      if (cmd.pointVente)
        o.source = { produit: produitId, pointVente: cmd.pointVente };
      break;
    case "CENTRAL":
      o.source = { produit: produitId, depotCentral: true };
      break;
    default:
      // FOURNISSEUR → pas de stock ici
      break;
  }

  // Mouvement.destination = Commande.source
  switch (route.source) {
    case "REGION":
      if (cmd.requestedRegion)
        o.destination = { produit: produitId, region: cmd.requestedRegion };
      break;
    case "PV":
      if (cmd.requestedPointVente)
        o.destination = {
          produit: produitId,
          pointVente: cmd.requestedPointVente,
        };
      break;
    case "CENTRAL":
      o.destination = { produit: produitId, depotCentral: true };
      break;
  }

  return o;
}

/** Fusionne proprement les coords override en champs visibles, sans cast `{}`. */
function visibleCoordsFromOverride(o: LivraisonOverride): Partial<{
  region: MId;
  pointVente: MId;
  depotCentral: boolean;
}> {
  const out: Partial<{ region: MId; pointVente: MId; depotCentral: boolean }> =
    {};

  // Préfère la destination côté reporting, sinon la source
  if (o.destination?.region || o.source?.region) {
    out.region = o.destination?.region ?? o.source?.region;
  }
  if (o.destination?.pointVente || o.source?.pointVente) {
    out.pointVente = o.destination?.pointVente ?? o.source?.pointVente;
  }
  if (o.destination?.depotCentral || o.source?.depotCentral) {
    out.depotCentral = true;
  }

  return out;
}

export const updateCommande = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { produits: produitsUpdates, ...updateDataRaw } = req.body;

    const existing = await (Commande as any).findById(id);
    if (!existing) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }

    // Appliquer uniquement les clés définies
    const updateData = pickDefined({
      user: updateDataRaw.user,
      region: updateDataRaw.region,
      pointVente: updateDataRaw.pointVente,
      requestedRegion: updateDataRaw.requestedRegion,
      requestedPointVente: updateDataRaw.requestedPointVente,
      fournisseur: updateDataRaw.fournisseur,
      depotCentral: updateDataRaw.depotCentral,
      statut: updateDataRaw.statut,
      numero: updateDataRaw.numero,
    });

    // Valider la route finale avant persistance (lève HttpError si invalide)
    resolveRouting({ ...existing.toObject(), ...updateData });

    // Persister l’en-tête
    const commande = await (Commande as any).findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );
    if (!commande) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }

    // Route persistée
    const route = resolveRouting(commande.toObject());

    // Mises à jour des lignes
    if (Array.isArray(produitsUpdates) && produitsUpdates.length > 0) {
      for (const prodUpdate of produitsUpdates) {
        const {
          _id: produitLigneId,
          statut,
          quantite,
          ...rest
        } = prodUpdate || {};
        if (!produitLigneId) continue;

        const produitCommande = await (CommandeProduit as any).findById(
          produitLigneId,
        );
        if (!produitCommande) continue;

        // Patch partiel
        for (const [k, v] of Object.entries(rest)) {
          (produitCommande as any)[k] = v;
        }
        if (typeof quantite === "number" && quantite > 0) {
          produitCommande.quantite = quantite;
        }

        const wasLivré = produitCommande.statut === "livré";
        const willBeLivré = statut === "livré";

        if (willBeLivré && !wasLivré) {
          // Fournisseur: pas de mouvement stock pour l’instant
          if (route.destination === "FOURNISSEUR") {
            produitCommande.statut = "livré";
            await produitCommande.save();
            continue;
          }

          // Anti-doublon
          if (!(produitCommande as any).mouvementStockId) {
            const qty =
              typeof quantite === "number" && quantite > 0
                ? quantite
                : (produitCommande.quantite as number);

            const override = buildInvertedOverride(
              route,
              commande,
              produitCommande.produit as MId,
            );
            const visible = visibleCoordsFromOverride(override);

            const mouvement: any = new (MouvementStock as any)({
              produit: produitCommande.produit,
              quantite: qty,
              montant: prodUpdate.montant ?? 0,
              type: "Livraison",
              statut: true,
              user: updateData.user ?? existing.user,
              commandeId: commande._id,
              ...visible, // champs visibles sûrs (région/PV/central)
            });

            // Orientation imposée (les hooks lisent _livraisonScopes)
            (mouvement as any)._livraisonScopes = override;

            await mouvement.save();
            (produitCommande as any).mouvementStockId = mouvement._id;
          }

          produitCommande.statut = "livré";
        } else if (statut && statut !== produitCommande.statut) {
          produitCommande.statut = statut;
        }

        await produitCommande.save();
      }
    }

    // Statut global
    const produitsCommande = await (CommandeProduit as any).find({
      commandeId: commande._id,
    });
    const tousLivres =
      produitsCommande.length > 0 &&
      produitsCommande.every((p: any) => p.statut === "livré");

    if (tousLivres && commande.statut !== "livrée") {
      commande.statut = "livrée";
      await commande.save();
    }

    const populated = await (Commande as any)
      .findById(commande._id)
      .populate(commonPopulate as any)
      .populate({ path: "produits", populate: { path: "produit" } });

    res.status(200).json(populated);
  } catch (error) {
    const status = (error as any)?.status || 400;
    res.status(status).json({
      message: "Erreur lors de la mise à jour de la commande.",
      error: (error as Error).message,
    });
  }
};
