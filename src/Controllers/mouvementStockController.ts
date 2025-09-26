// file: src/controllers/mouvementStockController.ts
import type { Request, Response, RequestHandler } from "express";
import mongoose, { PipelineStage } from "mongoose";
import {
  Commande,
  CommandeProduit,
  MouvementStock,
  PointVente,
  Produit,
} from "../Models/model";

/* ------------------------------ Utils locaux ------------------------------ */
const toObjectId = (v: string) => new mongoose.Types.ObjectId(String(v));

const toBool = (v: unknown, fallback = false): boolean => {
  if (v === undefined || v === null) return fallback;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(s);
};

const toId = (v?: any) =>
  v ? new mongoose.Types.ObjectId(String((v as any)?._id ?? v)) : undefined;

const parseIntSafe = (v: any, d: number) => {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const parseBool = (v: any) => {
  if (v === true || v === "true" || v === "1" || v === 1) return true;
  if (v === false || v === "false" || v === "0" || v === 0) return false;
  return undefined;
};

const sortDir = (order?: string) =>
  String(order).toLowerCase() === "asc" ? 1 : -1;

/* ------------------------------ Accès & scope ----------------------------- */
const isSuperAdmin = (req: Request) =>
  String((req.user as any)?.role ?? "").toLowerCase() === "superadmin";

const getUserIds = (req: Request) => {
  const u = (req.user as any) ?? {};
  return {
    userId: toId(u?._id),
    pvId: toId(u?.pointVente),
    rgId: toId(u?.region),
  };
};

/** Construit la portée selon le rôle + query (priorité PV→Region→User). */
function buildScope(req: Request) {
  const q: any = {};
  const { pvId, rgId, userId } = getUserIds(req);

  // Overrides de la query (uniquement si SuperAdmin)
  const qPV = toId((req.query as any).pointVente);
  const qRG = toId((req.query as any).region);
  const qUS = toId((req.query as any).user);

  if (isSuperAdmin(req)) {
    if (qPV) q.pointVente = qPV;
    else if (qRG) q.region = qRG;
    else if (qUS) q.user = qUS;
    return q;
  }

  // Non-SuperAdmin → on impose une portée
  if (qPV) q.pointVente = qPV;
  else if (qRG) q.region = qRG;
  else if (qUS) q.user = qUS;
  else if (pvId) q.pointVente = pvId;
  else if (rgId) q.region = rgId;
  else if (userId) q.user = userId;

  return q;
}

/** Filtres fonctionnels additionnels. */
function applyBusinessFilters(base: any, req: Request) {
  const out = { ...base };
  if ((req.query as any).produit) out.produit = toId((req.query as any).produit);
  if ((req.query as any).type) out.type = String((req.query as any).type);
  const st = parseBool((req.query as any).statut);
  if (typeof st === "boolean") out.statut = st;
  const depot = parseBool((req.query as any).depotCentral);
  if (typeof depot === "boolean") out.depotCentral = depot;

  // Date range (createdAt)
  const dateFrom = (req.query as any).dateFrom
    ? new Date(String((req.query as any).dateFrom))
    : undefined;
  const dateTo = (req.query as any).dateTo
    ? new Date(String((req.query as any).dateTo))
    : undefined;
  if (dateFrom || dateTo) {
    out.createdAt = {};
    if (dateFrom && !Number.isNaN(+dateFrom))
      (out.createdAt as any).$gte = dateFrom;
    if (dateTo && !Number.isNaN(+dateTo)) (out.createdAt as any).$lte = dateTo;
  }
  return out;
}

/** Populate commun */
function populateAll(q: any) {
  return q
    .populate("region")
    .populate({
      path: "pointVente",
      populate: { path: "region", model: "Region" },
    })
    .populate({
      path: "produit",
      populate: { path: "categorie", model: "Categorie" },
    })
    .populate({
      path: "user",
      populate: [
        { path: "pointVente", model: "PointVente" },
        { path: "region", model: "Region" },
      ],
    });
}

/** Vérifie accès à une région pour non-SuperAdmin. */
async function assertCanAccessRegion(req: Request, regionId: string): Promise<void> {
  const user = (req as any)?.user;
  if (!user) throw Object.assign(new Error("Non authentifié"), { status: 401 });
  const role = user.role;
  if (role === "SuperAdmin") return;

  const userRegionId: string | undefined =
    typeof user.region === "string" ? user.region : user?.region?._id;

  if (
    role === "AdminRegion" &&
    userRegionId &&
    String(userRegionId) === String(regionId)
  )
    return;

  throw Object.assign(new Error("Accès refusé à cette région"), { status: 403 });
}

/** Vérifie accès à un PV pour non-SuperAdmin. */
async function assertCanAccessPointVente(req: Request, pointVenteId: string) {
  if (isSuperAdmin(req)) return;
  const userPV = toId((req.user as any)?.pointVente);
  const userRG = toId((req.user as any)?.region);
  const pv: any = await PointVente.findById(toId(pointVenteId))
    .select("region")
    .lean();
  if (!pv) throw { status: 404, message: "Point de vente introuvable." };

  if (userPV && String(userPV) === String(pv._id)) return; // AdminPointVente
  if (userRG && String(userRG) === String(pv.region)) return; // AdminRegion

  throw { status: 403, message: "Accès PV refusé." };
}

/** Vérifie accès à un userId (soi-même si non-SuperAdmin). */
async function assertCanAccessUser(req: Request, targetUserId: string) {
  if (isSuperAdmin(req)) return;
  const self = toId((req.user as any)?._id);
  if (!self || String(self) !== String(toId(targetUserId))) {
    throw { status: 403, message: "Accès utilisateur refusé." };
  }
}

/** Aggregate obligatoire si tri nested ou recherche q. */
function mustUseAggregate(sortBy?: string, q?: string) {
  return Boolean(q) || (sortBy && sortBy.includes("."));
}

/** Pipeline aggregate (recherche sur produit.nom + tri nested). */
function buildAggregatePipeline(
  match: any,
  {
    q,
    sortBy,
    order,
    skip,
    limit,
  }: {
    q?: string;
    sortBy?: string;
    order: 1 | -1;
    skip: number;
    limit: number;
  },
): PipelineStage[] {
  const pipeline: PipelineStage[] = [{ $match: match }];

  pipeline.push(
    {
      $lookup: {
        from: "produits",
        localField: "produit",
        foreignField: "_id",
        as: "produit",
      },
    },
    { $unwind: "$produit" },
    {
      $lookup: {
        from: "categories",
        localField: "produit.categorie",
        foreignField: "_id",
        as: "produit.categorie",
      },
    },
    {
      $unwind: { path: "$produit.categorie", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "regions",
        localField: "region",
        foreignField: "_id",
        as: "region",
      },
    },
    { $unwind: { path: "$region", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "pointventes",
        localField: "pointVente",
        foreignField: "_id",
        as: "pointVente",
      },
    },
    { $unwind: { path: "$pointVente", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "regions",
        localField: "pointVente.region",
        foreignField: "_id",
        as: "pointVente.region",
      },
    },
    {
      $unwind: { path: "$pointVente.region", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  );

  if (q) {
    pipeline.push({ $match: { "produit.nom": { $regex: q, $options: "i" } } });
  }

  const sortField = sortBy && sortBy.length ? sortBy : "createdAt";
  pipeline.push({ $sort: { [sortField]: order as 1 | -1 } });

  pipeline.push({
    $facet: {
      metadata: [{ $count: "total" }],
      data: [{ $skip: skip }, { $limit: limit }],
    },
  });

  return pipeline;
}

/** Réponse paginée standard (void) */
function sendPaged(
  res: Response,
  {
    total,
    page,
    limit,
    mouvements,
  }: { total: number; page: number; limit: number; mouvements: any[] },
): void {
  res.json({
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    limit,
    mouvements,
  });
}

/* ------------------- Impl interne réutilisable (VOID) -------------------- */
async function handleAllMouvementsStockPage(req: Request, res: Response): Promise<void> {
  try {
    const page = parseIntSafe((req.query as any).page, 1);
    const limit = parseIntSafe((req.query as any).limit, 10);
    const skip = (page - 1) * limit;

    const sortBy = ((req.query as any).sortBy as string) || "createdAt";
    const order = sortDir((req.query as any).order as string);
    const q = ((req.query as any).q as string) || "";

    // 1) portée + filtres de base
    const scope = buildScope(req);
    const baseMatch = applyBusinessFilters(scope, req);

    // 1.b) si on filtre par région (sans PV explicite), étendre en OR(region || PV∈region)
    const onlyRegion = toBool((req.query as any).onlyRegion, false);
    let match = { ...baseMatch } as any;

    if (match.region && !match.pointVente && !onlyRegion) {
      const regionOID = toId(match.region);
      if (regionOID) {
        const pvIds = (await PointVente.distinct("_id", { region: regionOID }))
          .map((id: any) => toId(id))
          .filter(Boolean);

        const { region, ...rest } = match;
        const or: any[] = [{ region: regionOID }];
        if (pvIds.length) or.push({ pointVente: { $in: pvIds } });
        match = { ...rest, $or: or };
      }
    }

    // 2) stratégie
    if (mustUseAggregate(sortBy, q)) {
      const pipeline = buildAggregatePipeline(match, {
        q,
        sortBy,
        order,
        skip,
        limit,
      });
      const result = await MouvementStock.aggregate(pipeline);
      const data = result?.[0]?.data ?? [];
      const total = (result?.[0]?.metadata?.[0]?.total as number) ?? 0;
      sendPaged(res, { total, page, limit, mouvements: data });
      return;
    }

    // 3) find() + populate
    const total = await MouvementStock.countDocuments(match);
    const mouvements = await populateAll(
      MouvementStock.find(match).sort({ [sortBy]: order }).skip(skip).limit(limit),
    );

    sendPaged(res, { total, page, limit, mouvements });
  } catch (err: any) {
    const status = err?.status ?? 500;
    res.status(status).json({ message: "Erreur interne", error: err?.message ?? err });
  }
}

/* --------------------------------- Routes --------------------------------- */
// GET /mouvements/page
export const getAllMouvementsStockPage: RequestHandler = async (req, res) => {
  await handleAllMouvementsStockPage(req, res);
};

// LISTE NON PAGINÉE → redirige vers la version paginée
export const getAllMouvementsStock: RequestHandler = async (req, res) => {
  await handleAllMouvementsStockPage(req, res);
};

// GET /mouvements/by-region/:regionId/page
export const getMouvementStockByRegionPage: RequestHandler = async (req, res) => {
  try {
    const { regionId } = req.params as { regionId?: string };
    if (!regionId) {
      res.status(400).json({ message: "regionId requis" });
      return;
    }
    await assertCanAccessRegion(req, regionId);
    (req.query as any).region = regionId;
    await handleAllMouvementsStockPage(req, res);
  } catch (err: any) {
    const status = err?.status ?? 500;
    res.status(status).json({ message: err?.message ?? "Erreur interne" });
  }
};

// GET /mouvements/by-point-vente/:pointVenteId/page
export const getMouvementsStockByPointVentePage: RequestHandler = async (req, res) => {
  try {
    const { pointVenteId } = req.params as { pointVenteId?: string };
    if (!pointVenteId) {
      res.status(400).json({ message: "pointVenteId requis" });
      return;
    }
    await assertCanAccessPointVente(req, pointVenteId);
    (req.query as any).pointVente = pointVenteId;
    await handleAllMouvementsStockPage(req, res);
  } catch (err: any) {
    const status = err?.status ?? 500;
    res.status(status).json({ message: err?.message ?? "Erreur interne" });
  }
};

export const getMouvementStockById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params as { id?: string };
    const mv: any = await populateAll(MouvementStock.findById(id));
    if (!mv) {
      res.status(404).json({ message: "Mouvement non trouvé" });
      return;
    }

    // contrôle d’accès au doc isolé
    const scope = buildScope(req);
    if (
      !isSuperAdmin(req) &&
      !(
        (scope.pointVente && String(scope.pointVente) === String(mv.pointVente?._id)) ||
        (scope.region && String(scope.region) === String(mv.region?._id)) ||
        (scope.user && String(scope.user) === String(mv.user?._id))
      )
    ) {
      res.status(403).json({ message: "Accès refusé" });
      return;
    }

    res.json(mv);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// GET "/by-point-vente/:pointVenteId" (legacy non paginé → renvoie paginé)
export const getMouvementsStockByPointVente: RequestHandler = async (req, res) => {
  try {
    const { pointVenteId } = req.params as { pointVenteId?: string };
    if (!pointVenteId) {
      res.status(400).json({ message: "ID requis" });
      return;
    }
    await assertCanAccessPointVente(req, pointVenteId);
    (req.query as any).pointVente = pointVenteId;
    await handleAllMouvementsStockPage(req, res);
  } catch (err: any) {
    res.status(err?.status ?? 500).json({ message: err?.message ?? "Erreur interne" });
  }
};

// GET "/by-point-vente/page/:pointVenteId"
export const getMouvementsStockByPointVenteId: RequestHandler = async (req, res) => {
  try {
    const { pointVenteId } = req.params as { pointVenteId?: string };
    if (!pointVenteId) {
      res.status(400).json({ message: "ID requis" });
      return;
    }
    await assertCanAccessPointVente(req, pointVenteId);
    (req.query as any).pointVente = pointVenteId;
    await handleAllMouvementsStockPage(req, res);
  } catch (err: any) {
    res.status(err?.status ?? 500).json({ message: err?.message ?? "Erreur interne" });
  }
};

// GET "/region/:regionId"
export const getMouvementStockByRegion: RequestHandler = async (req, res) => {
  try {
    const { regionId } = req.params as { regionId?: string };
    if (!regionId || !mongoose.isValidObjectId(regionId)) {
      res.status(400).json({ message: "regionId requis ou invalide" });
      return;
    }

    const regionOID = toObjectId(regionId);

    // AuthZ
    await assertCanAccessRegion(req, regionId);

    // pagination & tri
    const page = Math.max(parseInt(String((req.query as any).page ?? "1"), 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(String((req.query as any).limit ?? "20"), 10) || 20, 1),
      200,
    );
    const skip = (page - 1) * limit;

    const sortBy = ((req.query as any).sortBy as string) || "createdAt";
    const order =
      (((req.query as any).order as string) || "desc").toLowerCase() === "asc" ? 1 : -1;

    const includeRefs = toBool((req.query as any).includeRefs, true);
    const includeTotal = toBool((req.query as any).includeTotal, false);

    // base filters (NE PAS inclure region/pointVente ici)
    const baseFilter: Record<string, any> = {};
    if ((req.query as any).type) baseFilter.type = (req.query as any).type;
    if ((req.query as any).produit) {
      const pid = String((req.query as any).produit);
      if (mongoose.isValidObjectId(pid)) baseFilter.produit = toObjectId(pid);
    }
    const createdAt: any = {};
    if ((req.query as any).dateFrom) createdAt.$gte = new Date(String((req.query as any).dateFrom));
    if ((req.query as any).dateTo) createdAt.$lte = new Date(String((req.query as any).dateTo));
    if (Object.keys(createdAt).length) baseFilter.createdAt = createdAt;

    // Récupère les PV de la région
    const rawPvIds = await PointVente.distinct("_id", { region: regionOID });
    const pvIds: mongoose.Types.ObjectId[] = rawPvIds.map((id: any) =>
      toObjectId(String(id)),
    );

    // Filtre final
    const regionOrPVFilter: Record<string, any> = {
      $or: [{ region: regionOID }, ...(pvIds.length ? [{ pointVente: { $in: pvIds } }] : [])],
    };

    // filtre optionnel PV précis
    let pvMatchClause: Record<string, any> = {};
    if ((req.query as any).pointVente && mongoose.isValidObjectId(String((req.query as any).pointVente))) {
      pvMatchClause = { pointVente: toObjectId(String((req.query as any).pointVente)) };
    }

    const finalFilter = { $and: [baseFilter, regionOrPVFilter, pvMatchClause] };

    let query = MouvementStock.find(finalFilter)
      .sort({ [sortBy]: order as 1 | -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (includeRefs) {
      query = query
        .populate({
          path: "produit",
          populate: { path: "categorie", model: "Categorie" },
        })
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate("region")
        .populate("user")
        .populate("commandeId");
    }

    const execList = query.exec();
    const execCount = includeTotal ? MouvementStock.countDocuments(finalFilter) : null;

    const [items, total] = await Promise.all([execList, execCount]);

    if (includeTotal) {
      res.json({
        items,
        total,
        page,
        limit,
        sortBy,
        order: order === 1 ? "asc" : "desc",
      });
      return;
    }

    res.json(items);
  } catch (err: any) {
    res.status(err?.status ?? 500).json({ message: err?.message ?? "Erreur interne" });
  }
};

// GET "/byUser/:userId"
export const getMouvementsStockByUserId: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params as { userId?: string };
    if (!userId) {
      res.status(400).json({ message: "ID utilisateur requis" });
      return;
    }
    await assertCanAccessUser(req, userId);
    (req.query as any).user = userId;
    await handleAllMouvementsStockPage(req, res);
  } catch (err: any) {
    res.status(err?.status ?? 500).json({ message: err?.message ?? "Erreur interne" });
  }
};

/* ----------------------------- CREATE / UPDATE ---------------------------- */
// POST "/"
export const createMouvementStock: RequestHandler = async (req, res) => {
  try {
    const {
      pointVente,
      depotCentral,
      produit,
      type,
      quantite,
      montant,
      statut,
      region,
      user,
    } = req.body as any;

    const hasPV = !!pointVente;
    const hasRG = !!region;
    const hasDC = depotCentral === true;

    if (!hasPV && !hasRG && !hasDC) {
      res.status(400).json({
        message: "Associer un point de vente, une région ou le dépôt central.",
      });
      return;
    }
    if (!user) {
      res.status(400).json({ message: "L'utilisateur est requis" });
      return;
    }

    const mouvementData: any = {
      produit,
      type,
      quantite,
      montant,
      statut,
      user,
      depotCentral: !!depotCentral,
    };
    if (pointVente) mouvementData.pointVente = toId(pointVente);
    if (region) mouvementData.region = toId(region);

    const mouvement = await new MouvementStock(mouvementData).save();
    const populated = await populateAll(MouvementStock.findById(mouvement._id));
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(400).json({
      message: "Erreur lors de la création",
      error: err?.message ?? err,
    });
  }
};

// PUT "/:id"
export const updateMouvementStock: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params as { id?: string };
    const {
      pointVente,
      depotCentral,
      produit,
      type,
      quantite,
      montant,
      statut,
      region,
      user,
    } = req.body as any;

    const hasPV = !!pointVente;
    const hasRG = !!region;
    const hasDC = depotCentral === true;

    if (!hasPV && !hasRG && !hasDC) {
      res.status(400).json({
        message: "Associer un point de vente, une région ou le dépôt central.",
      });
      return;
    }
    if (!user) {
      res.status(400).json({ message: "L'utilisateur est requis" });
      return;
    }

    const updateData: any = {
      produit,
      type,
      quantite,
      montant,
      statut,
      user: toId(user),
      depotCentral: !!depotCentral,
    };
    if (pointVente) updateData.pointVente = toId(pointVente);
    if (region) updateData.region = toId(region);

    const updated = await populateAll(
      MouvementStock.findByIdAndUpdate(id, updateData, { new: true }),
    );
    if (!updated) {
      res.status(404).json({ message: "Mouvement non trouvé" });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({
      message: "Erreur lors de la mise à jour",
      error: err?.message ?? err,
    });
  }
};

// DELETE "/:id"
export const deleteMouvementStock: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params as { id?: string };
    await MouvementStock.findByIdAndDelete(id);
    res.json({ message: "Mouvement supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// PUT "/validate/:id"
export const validateState: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params as { id?: string };
    const mouvement = await populateAll(
      MouvementStock.findByIdAndUpdate(id, { statut: true }, { new: true }),
    );
    if (!mouvement) {
      res.status(404).json({ message: "Mouvement non trouvé" });
      return;
    }
    res.json({ message: "Statut du mouvement mis à jour", mouvement });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la validation", error: err });
  }
};

/* --------------------------- Agrégations (OK) ----------------------------- */
// GET "/byUser/aggregate/:userId"
export const getMouvementsStockAggregatedByUserId: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params as { userId?: string };
    const page = parseIntSafe((req.query as any).page, 1);
    const limit = parseIntSafe((req.query as any).limit, 10);
    const skip = (page - 1) * limit;

    if (!userId) {
      res.status(400).json({ message: "ID utilisateur requis" });
      return;
    }
    await assertCanAccessUser(req, userId);

    const aggregationPipeline: PipelineStage[] = [
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$produit",
          totalQuantite: { $sum: "$quantite" },
          totalMontant: { $sum: "$montant" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          produit: "$_id",
          totalQuantite: 1,
          totalMontant: 1,
          count: 1,
        },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const result = await MouvementStock.aggregate(aggregationPipeline);
    const data = result[0]?.data || [];
    const metadata = result[0]?.metadata || [];
    const total = metadata.length > 0 ? metadata[0].total : 0;

    if (!data.length) {
      res.status(404).json({ message: "Aucun mouvement trouvé pour cet utilisateur" });
      return;
    }

    const populatedData = await Promise.all(
      data.map(async (item: any) => {
        const populatedProduit = await Produit.findById(item.produit).populate({
          path: "categorie",
          model: "Categorie",
        });
        return { ...item, produit: populatedProduit };
      }),
    );

    const sortedData = populatedData.sort((a, b) => {
      const nomA = a.produit?.nom || "";
      const nomB = b.produit?.nom || "";
      return nomA.localeCompare(nomB);
    });

    res.json({
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      limit,
      mouvements: sortedData,
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// GET "/by-point-vente/aggregate/:pointVenteId"
export const getMouvementsStockAggregatedByPointVente: RequestHandler = async (req, res) => {
  try {
    const { pointVenteId } = req.params as { pointVenteId?: string };
    const page = parseIntSafe((req.query as any).page, 1);
    const limit = parseIntSafe((req.query as any).limit, 10);
    const skip = (page - 1) * limit;

    if (!pointVenteId) {
      res.status(400).json({ message: "ID point de vente requis" });
      return;
    }
    await assertCanAccessPointVente(req, pointVenteId);

    const aggregationPipeline: PipelineStage[] = [
      { $match: { pointVente: new mongoose.Types.ObjectId(pointVenteId) } },
      {
        $lookup: {
          from: "produits",
          localField: "produit",
          foreignField: "_id",
          as: "produitInfo",
        },
      },
      { $unwind: "$produitInfo" },
      {
        $lookup: {
          from: "categories",
          localField: "produitInfo.categorie",
          foreignField: "_id",
          as: "categorieInfo",
        },
      },
      { $unwind: { path: "$categorieInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { produitId: "$produit", type: "$type" },
          totalQuantite: { $sum: "$quantite" },
          totalMontant: { $sum: "$montant" },
          count: { $sum: 1 },
          produitData: { $first: "$produitInfo" },
          categorieData: { $first: "$categorieInfo" },
        },
      },
      {
        $project: {
          _id: 0,
          produit: {
            _id: "$produitData._id",
            nom: "$produitData.nom",
            code: "$produitData.code",
            categorie: "$categorieData",
          },
          type: "$_id.type",
          totalQuantite: 1,
          totalMontant: 1,
          count: 1,
        },
      },
      { $sort: { "produit.nom": 1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const result = await MouvementStock.aggregate(aggregationPipeline);
    const data = result[0]?.data || [];
    const metadata = result[0]?.metadata || [];
    const total = metadata.length > 0 ? metadata[0].total : 0;

    if (!data.length) {
      res.status(404).json({ message: "Aucun mouvement trouvé" });
      return;
    }

    res.json({
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      limit,
      mouvements: data,
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

/* ------------------------------ Livraison --------------------------------- */
export const livrerProduitCommande: RequestHandler = async (req, res) => {
  try {
    const {
      commandeId,
      produit,
      quantite,
      montant,
      user,
      pointVente,
      region,
      depotCentral,
    } = req.body as any;

    if (!commandeId || !produit || !quantite || !montant || !user) {
      res.status(400).json({
        message: "commandeId, produit, quantite, montant et user sont requis.",
      });
      return;
    }

    const hasPointVente = !!pointVente;
    const hasRegion = !!region;
    const hasDepotCentral = depotCentral === true;

    if (!hasPointVente && !hasRegion && !hasDepotCentral) {
      res.status(400).json({
        message:
          "Le mouvement doit être associé à un point de vente, une région ou un dépôt central.",
      });
      return;
    }

    const commande = await Commande.findById(commandeId);
    if (!commande) {
      res.status(404).json({ message: "Commande non trouvée." });
      return;
    }

    const produitCommande = await CommandeProduit.findOne({
      commande: commandeId,
      produit,
      statut: "attente",
    });

    if (!produitCommande) {
      res.status(400).json({
        message:
          "Ce produit n'existe pas dans la commande ou a déjà été livré/annulé.",
      });
      return;
    }

    if (quantite < produitCommande.quantite) {
      res.status(400).json({
        message: "Quantité livrée inférieure à la quantité commandée.",
      });
      return;
    }

    const mouvementData: any = {
      produit: new mongoose.Types.ObjectId(produit),
      quantite,
      montant,
      type: "Livraison",
      statut: true,
      user: new mongoose.Types.ObjectId(user),
      commandeId: new mongoose.Types.ObjectId(commandeId),
      depotCentral: !!depotCentral,
    };

    if (pointVente)
      mouvementData.pointVente = new mongoose.Types.ObjectId(pointVente);
    if (region) mouvementData.region = new mongoose.Types.ObjectId(region);

    const mouvement = new MouvementStock(mouvementData);
    await mouvement.save();

    // Mise à jour du produit livré
    produitCommande.statut = "livré";
    produitCommande.mouvementStockId = mouvement._id;
    await produitCommande.save();

    // Vérification globale de la commande
    const produitsCommande = await CommandeProduit.find({ commande: commandeId });
    const tousLivres = produitsCommande.every((p) => p.statut === "livré");
    if (tousLivres) {
      commande.statut = "livrée";
      await commande.save();
    }

    const populatedMouvement = await MouvementStock.findById(mouvement._id)
      .populate("produit")
      .populate("commandeId")
      .populate("user")
      .populate("region")
      .populate({
        path: "pointVente",
        populate: { path: "region", model: "Region" },
      });

    res.status(201).json({
      message: "Produit livré avec succès.",
      livraison: populatedMouvement,
    });
  } catch (err) {
    res.status(400).json({
      message: "Erreur lors de la livraison du produit",
      error: (err as Error).message,
    });
  }
};
