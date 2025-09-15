// /src/controllers/commandeController.ts
// Contrôleur Commande — complet, sans `return res(...)`, avec filtres requestedRegion/requestedPointVente/fournisseur

import { Request, Response } from "express";
import mongoose from "mongoose";
import { Commande, CommandeProduit, MouvementStock } from "../Models/model";
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

// ---------------------------------------------------------
// Handlers
// ---------------------------------------------------------
export const getAllCommandes = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { skip, limit } = getPaginationOptions(req);
    const filters = buildCommandeFilters(req);

    const commandes = await (Commande as any)
      .find(filters)
      .skip(skip)
      .limit(limit)
      .populate(commonPopulate as any);

    const total = await Commande.countDocuments(filters);
    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res
      .status(400)
      .json({
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

    const commandes = await (Commande as any)
      .find({ user: userId })
      .skip(skip)
      .limit(limit)
      .populate(commonPopulate as any);

    const total = await Commande.countDocuments({ user: userId });
    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la récupération des commandes utilisateur.",
        error: (error as Error).message,
      });
  }
};

export const getCommandesByPointVente = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { pointVenteId } = req.params;
    const { skip, limit } = getPaginationOptions(req);

    const commandes = await (Commande as any)
      .find({ pointVente: pointVenteId })
      .skip(skip)
      .limit(limit)
      .populate(commonPopulate as any);

    const total = await Commande.countDocuments({ pointVente: pointVenteId });
    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res
      .status(400)
      .json({
        message:
          "Erreur lors de la récupération des commandes par point de vente.",
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

    const commandes = await (Commande as any)
      .find({
        $or: [
          { region: regionId },
          { requestedRegion: regionId },
          { pointVente: { $ne: null } },
          { requestedPointVente: { $ne: null } },
        ],
      })
      .skip(skip)
      .limit(limit)
      .populate(commonPopulate as any);

    const filtered = (commandes as any[]).filter((cmd: any) => {
      const destRegionId = cmd.region?._id?.toString();
      const srcRegionId = cmd.requestedRegion?._id?.toString();
      const destPVRegionId = (cmd.pointVente as any)?.region?._id?.toString();
      const srcPVRegionId = (
        cmd.requestedPointVente as any
      )?.region?._id?.toString();
      return (
        destRegionId === regionId ||
        srcRegionId === regionId ||
        destPVRegionId === regionId ||
        srcPVRegionId === regionId
      );
    });

    const formatted = await Promise.all(filtered.map(formatCommande));
    res.status(200).json({ total: filtered.length, commandes: formatted });
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors de la récupération des commandes par région.",
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

    const commandes = await (Commande as any)
      .find({ requestedRegion: requestedRegionId })
      .skip(skip)
      .limit(limit)
      .populate(commonPopulate as any);

    const total = await Commande.countDocuments({
      requestedRegion: requestedRegionId,
    });
    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res
      .status(400)
      .json({
        message:
          "Erreur lors des commandes par région source (requestedRegion).",
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

    const commandes = await (Commande as any)
      .find({ requestedPointVente: requestedPointVenteId })
      .skip(skip)
      .limit(limit)
      .populate(commonPopulate as any);

    const total = await Commande.countDocuments({
      requestedPointVente: requestedPointVenteId,
    });
    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res
      .status(400)
      .json({
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

    const commandes = await (Commande as any)
      .find({ fournisseur: fournisseurId })
      .skip(skip)
      .limit(limit)
      .populate(commonPopulate as any);

    const total = await Commande.countDocuments({ fournisseur: fournisseurId });
    const formatted = await Promise.all(commandes.map(formatCommande));
    res.status(200).json({ total, commandes: formatted });
  } catch (error) {
    res
      .status(400)
      .json({
        message: "Erreur lors des commandes par fournisseur.",
        error: (error as Error).message,
      });
  }
};

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
    res
      .status(400)
      .json({
        message: "Erreur lors de la récupération de la commande.",
        error: (error as Error).message,
      });
  }
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

    if (!user || !Array.isArray(produits) || produits.length === 0) {
      res
        .status(400)
        .json({ message: "L'utilisateur et les produits sont requis." });
      return;
    }

    resolveRouting(req.body);

    const numero = `CMD-${Date.now()}`;
    const commande = new (Commande as any)({
      numero,
      user,
      region,
      pointVente,
      requestedRegion,
      requestedPointVente,
      depotCentral: !!depotCentral,
      fournisseur,
      produits: [],
      statut: "attente",
    });
    await commande.save();

    const createdCommandeProduits = await Promise.all(
      produits.map(async (prod: any) => {
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
    res
      .status(status)
      .json({
        message: "Erreur lors de la création de la commande.",
        error: (error as Error).message,
      });
  }
};

export const updateCommande = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { produits: produitsUpdates, ...updateData } = req.body;

    const existing = await (Commande as any).findById(id);
    if (!existing) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }

    const preview = { ...existing.toObject(), ...updateData };
    resolveRouting(preview);

    const commande = await (Commande as any).findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!commande) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }

    if (Array.isArray(produitsUpdates) && produitsUpdates.length > 0) {
      for (const prodUpdate of produitsUpdates) {
        const { _id: produitId, statut, quantite, ...rest } = prodUpdate;
        if (!produitId) continue;

        const produitCommande = await (CommandeProduit as any).findById(
          produitId,
        );
        if (!produitCommande) continue;

        for (const key of Object.keys(rest)) {
          (produitCommande as any)[key] = (rest as any)[key];
        }

        if (statut && statut !== produitCommande.statut) {
          if (statut === "livré") {
            if (produitCommande.statut !== "livré") {
              const mouvementData: any = {
                produit: produitCommande.produit,
                quantite: quantite ?? produitCommande.quantite,
                montant: prodUpdate.montant ?? 0,
                type: "Livraison",
                statut: true,
                user: updateData.user,
                commandeId: commande._id,
                depotCentral: preview.depotCentral || false,
              };
              if (preview.pointVente)
                mouvementData.pointVente = preview.pointVente;
              if (preview.region) mouvementData.region = preview.region;

              const mouvement = new (MouvementStock as any)(mouvementData);
              await mouvement.save();

              produitCommande.mouvementStockId = mouvement._id;
              produitCommande.statut = "livré";
            }
          } else {
            produitCommande.statut = statut;
          }
        }

        await produitCommande.save();
      }
    }

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
    res
      .status(status)
      .json({
        message: "Erreur lors de la mise à jour de la commande.",
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
    res
      .status(400)
      .json({
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
    res
      .status(500)
      .json({
        message: "Erreur lors de l'impression du bon de commande.",
        error: (error as Error).message,
      });
  }
};
