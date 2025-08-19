// controllers/commandeController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  Commande,
  CommandeProduit,
  MouvementStock,
  PointVente,
} from "../Models/model";

/* --------------------------- Utils pagination/sort -------------------------- */
const getListOptions = (req: Request) => {
  const page = Math.max(parseInt(String(req.query.page ?? "1"), 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(String(req.query.limit ?? "10"), 10) || 10, 1),
    100,
  );
  const skip = (page - 1) * limit;
  const sortBy = String(req.query.sortBy || "createdAt");
  const order =
    String(req.query.order || "desc").toLowerCase() === "asc" ? 1 : -1;
  const sort = { [sortBy]: order as 1 | -1 };
  return { page, limit, skip, sort };
};

const commonPopulate = [
  { path: "user", select: "-password" },
  { path: "region" },
  { path: "pointVente", populate: { path: "region", model: "Region" } },
];

/* ------------------------------ Format commande ---------------------------- */
const formatCommande = async (commande: any) => {
  await commande.populate({
    path: "produits",
    populate: { path: "produit", model: "Produit" },
  });

  // Montant total = somme(prix * quantité) sur lignes
  let montant = 0;

  // Taux de livraison — on calcule 2 métriques utiles
  let lignesLivrees = 0;
  let quantiteTotale = 0;
  let quantiteLivree = 0;

  commande.produits.forEach((cp: any) => {
    const prix = cp?.produit?.prix ?? 0;
    const qte = cp?.quantite ?? 0;
    montant += prix * qte;

    quantiteTotale += qte;
    if (cp.statut === "livré") {
      lignesLivrees += 1;
      quantiteLivree += qte;
    }
  });

  const totalLignes = commande.produits.length || 1;
  const tauxLivraisonLignes = Math.round((lignesLivrees / totalLignes) * 100);
  const tauxLivraisonQuantite =
    quantiteTotale > 0
      ? Math.round((quantiteLivree / quantiteTotale) * 100)
      : 0;

  return {
    ...commande.toObject(),
    montant,
    lignes: totalLignes,
    lignesLivrees,
    tauxLivraisonLignes,
    tauxLivraisonQuantite,
  };
};

/* --------------------------------- GET all --------------------------------- */
export const getAllCommandes = async (req: Request, res: Response) => {
  try {
    const { skip, limit, sort, page } = getListOptions(req);

    // petits filtres optionnels: q (numero), user, region, pointVente
    const q = String(req.query.q || "").trim();
    const where: Record<string, any> = {};
    if (q) where.numero = { $regex: q, $options: "i" };
    if (
      req.query.user &&
      mongoose.Types.ObjectId.isValid(String(req.query.user))
    ) {
      where.user = req.query.user;
    }
    if (
      req.query.region &&
      mongoose.Types.ObjectId.isValid(String(req.query.region))
    ) {
      where.region = req.query.region;
    }
    if (
      req.query.pointVente &&
      mongoose.Types.ObjectId.isValid(String(req.query.pointVente))
    ) {
      where.pointVente = req.query.pointVente;
    }

    const [total, rows] = await Promise.all([
      Commande.countDocuments(where),
      Commande.find(where)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate),
    ]);

    const commandes = await Promise.all(rows.map(formatCommande));
    res.status(200).json({ total, page, limit, commandes });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération des commandes.",
      error: (error as Error).message,
    });
  }
};

/* ------------------------------- GET by user ------------------------------- */
export const getCommandesByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: "userId invalide" });
      return;
    }

    const { skip, limit, sort, page } = getListOptions(req);
    const [total, rows] = await Promise.all([
      Commande.countDocuments({ user: userId }),
      Commande.find({ user: userId })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate),
    ]);

    const commandes = await Promise.all(rows.map(formatCommande));
    res.status(200).json({ total, page, limit, commandes });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération des commandes utilisateur.",
      error: (error as Error).message,
    });
  }
};

/* --------------------------- GET by point de vente ------------------------- */
export const getCommandesByPointVente = async (req: Request, res: Response) => {
  try {
    const { pointVenteId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(pointVenteId)) {
      res.status(400).json({ message: "pointVenteId invalide" });
      return;
    }

    const { skip, limit, sort, page } = getListOptions(req);
    const [total, rows] = await Promise.all([
      Commande.countDocuments({ pointVente: pointVenteId }),
      Commande.find({ pointVente: pointVenteId })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate),
    ]);

    const commandes = await Promise.all(rows.map(formatCommande));
    res.status(200).json({ total, page, limit, commandes });
  } catch (error) {
    res.status(400).json({
      message:
        "Erreur lors de la récupération des commandes par point de vente.",
      error: (error as Error).message,
    });
  }
};

/* -------------------------------- GET by region ---------------------------- */
export const getCommandesByRegion = async (req: Request, res: Response) => {
  try {
    const { regionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(regionId)) {
      res.status(400).json({ message: "regionId invalide" });
      return;
    }

    const { skip, limit, sort, page } = getListOptions(req);

    // Récupère les PV de la région pour une requête directe (au lieu de filtrer en JS)
    const pvIds = await PointVente.find({ region: regionId }).distinct("_id");

    const where = {
      $or: [
        { region: new mongoose.Types.ObjectId(regionId) },
        { pointVente: { $in: pvIds } },
      ],
    };

    const [total, rows] = await Promise.all([
      Commande.countDocuments(where),
      Commande.find(where)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate),
    ]);

    const commandes = await Promise.all(rows.map(formatCommande));
    res.status(200).json({ total, page, limit, commandes });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la récupération des commandes par région.",
      error: (error as Error).message,
    });
  }
};

/* -------------------------------- GET by id -------------------------------- */
export const getCommandeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "id invalide" });
      return;
    }

    const commande = await Commande.findById(id).populate(commonPopulate);
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

/* ----------------------------------- POST ---------------------------------- */
export const createCommande = async (req: Request, res: Response) => {
  try {
    const { user, region, pointVente, depotCentral, produits } = req.body;

    if (!user || !Array.isArray(produits) || produits.length === 0) {
      res
        .status(400)
        .json({ message: "L'utilisateur et les produits sont requis." });
      return;
    }

    const hasPointVente = !!pointVente;
    const hasRegion = !!region;
    const hasDepotCentral = depotCentral === true;
    if (!hasPointVente && !hasRegion && !hasDepotCentral) {
      res
        .status(400)
        .json({ message: "La commande doit être liée à une localisation." });
      return;
    }

    const numero = `CMD-${Date.now()}`;
    const commande = new Commande({
      numero,
      user,
      region: region || undefined,
      pointVente: pointVente || undefined,
      depotCentral: !!depotCentral,
      produits: [],
      statut: "attente",
    });
    await commande.save();

    // Crée les lignes et relie-les à la commande
    const createdLignes = await Promise.all(
      produits.map(async (p: any) => {
        const cp = new CommandeProduit({
          commandeId: commande._id,
          produit: p.produit,
          quantite: p.quantite,
          uniteMesure: p.uniteMesure,
          statut: "attente",
        });
        await cp.save();
        return cp._id;
      }),
    );

    commande.produits = createdLignes;
    await commande.save();

    const populated = await Commande.findById(commande._id)
      .populate(commonPopulate)
      .populate({ path: "produits", populate: { path: "produit" } });

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la création de la commande.",
      error: (error as Error).message,
    });
  }
};

/* ----------------------------------- PUT ----------------------------------- */
export const updateCommande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "id invalide" });
      return;
    }

    const { produits: produitsUpdates, ...updateData } = req.body;

    // 1) Mise à jour de la commande (hors produits)
    const commande = await Commande.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!commande) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }

    // 2) Mise à jour des lignes si fournies
    if (Array.isArray(produitsUpdates) && produitsUpdates.length > 0) {
      for (const prodUpdate of produitsUpdates) {
        const { _id: ligneId, statut, quantite, montant, ...rest } = prodUpdate;
        if (!ligneId || !mongoose.Types.ObjectId.isValid(String(ligneId)))
          continue;

        const ligne = await CommandeProduit.findById(ligneId);
        if (!ligne) continue;

        // champs libres
        Object.assign(ligne, rest);
        if (typeof quantite === "number") ligne.quantite = quantite;

        // gestion du statut
        if (statut && statut !== ligne.statut) {
          if (statut === "livré") {
            if (ligne.statut !== "livré") {
              // Création du mouvement stock lié
              const mouvementData: any = {
                produit: ligne.produit,
                quantite:
                  typeof quantite === "number" ? quantite : ligne.quantite,
                montant: typeof montant === "number" ? montant : 0,
                type: "Livraison",
                statut: true,
                user: updateData.user || commande.user, // fallback user de la commande
                commandeId: commande._id,
                depotCentral: !!(
                  updateData.depotCentral ?? commande.depotCentral
                ),
              };
              if (updateData.pointVente ?? commande.pointVente) {
                mouvementData.pointVente =
                  updateData.pointVente ?? commande.pointVente;
              }
              if (updateData.region ?? commande.region) {
                mouvementData.region = updateData.region ?? commande.region;
              }

              const mouvement = new MouvementStock(mouvementData);
              await mouvement.save();

              ligne.mouvementStockId = mouvement._id;
              ligne.statut = "livré";
            }
          } else {
            // autres transitions de statut
            ligne.statut = statut;
          }
        }

        await ligne.save();
      }
    }

    // 3) Rechargement des lignes pour calcul statut global
    const lignesCmd = await CommandeProduit.find({ commandeId: commande._id });
    const tousLivres =
      lignesCmd.length > 0 && lignesCmd.every((l) => l.statut === "livré");
    if (tousLivres && commande.statut !== "livrée") {
      commande.statut = "livrée";
      await commande.save();
    }

    // 4) Retourner la commande peuplée
    const populated = await Commande.findById(commande._id)
      .populate(commonPopulate)
      .populate({ path: "produits", populate: { path: "produit" } });

    res.status(200).json(populated);
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la mise à jour de la commande.",
      error: (error as Error).message,
    });
  }
};

/* ---------------------------------- DELETE --------------------------------- */
export const deleteCommande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "id invalide" });
      return;
    }

    const deleted = await Commande.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }

    // on supprime aussi les lignes associées
    await CommandeProduit.deleteMany({ commandeId: id });

    res.status(200).json({ message: "Commande supprimée avec succès." });
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la suppression.",
      error: (error as Error).message,
    });
  }
};
