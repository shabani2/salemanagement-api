// controllers/mvtStockController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MouvementStock } from '../Models/model'; // <- adapte le chemin si besoin

type Order = 'asc' | 'desc';

/* ============================== Helpers ============================== */

const toInt = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/** Filtre texte simple (champ directs). Pour rechercher dans les refs (produit.nom, etc.),
 *  il faudrait passer par une agrégation + $lookup + $unwind + $match.
 *  Ici on garde un LIKE léger sur des champs présents dans la collection.
 */
const like = (q?: string) =>
  q && q.trim()
    ? {
        $or: [
          // adapter selon le schéma réel si vous stockez ces champs
          { type: { $regex: q, $options: 'i' } },
          // { someDenormalizedField: { $regex: q, $options: 'i' } },
        ],
      }
    : {};

const buildFilter = (query: any) => {
  const f: any = {};
  if (query.type && query.type !== 'Tout') f.type = String(query.type);

  if (query.pointVente && mongoose.Types.ObjectId.isValid(query.pointVente)) {
    f.pointVente = new mongoose.Types.ObjectId(query.pointVente);
  }
  if (query.region && mongoose.Types.ObjectId.isValid(query.region)) {
    f.region = new mongoose.Types.ObjectId(query.region);
  }

  // Vous pouvez ajouter d'autres filtres si nécessaire (user, date, etc.)
  return f;
};

/**
 * Parse pagination de façon tolérante :
 * - Par défaut : `page` est 0-based → skip = page * limit
 * - Si `first`/`offset` est fourni, on l'utilise directement
 * - Option `page1=true` pour un mode 1-based (skip = (page-1)*limit)
 */
const parsePaging = (req: Request) => {
  const limit = Math.max(1, toInt(req.query.limit, 10));

  // Mode "offset" prioritaire si present
  const hasOffset = req.query.first !== undefined || req.query.offset !== undefined;
  if (hasOffset) {
    const offset = Math.max(0, toInt(req.query.first ?? req.query.offset, 0));
    return { limit, skip: offset, page: Math.floor(offset / limit) };
  }

  // Sinon, on lit "page"
  const rawPage = toInt(req.query.page, 0);
  const page1 = String(req.query.page1 || '').toLowerCase() === 'true';
  const page = Math.max(0, rawPage);

  const skip = page1
    ? Math.max(0, (page - 1) * limit) // 1-based si page1=true
    : page * limit; // 0-based par défaut

  return { limit, skip, page };
};

/* ============================== Controllers ============================== */

/**
 * GET /mouvements
 * Query params supportés :
 * - page (0-based par défaut), limit
 * - OU first/offset + limit
 * - page1=true pour forcer un comportement 1-based sur "page"
 * - sortBy, order (asc|desc)
 * - q (recherche légère), type, region, pointVente
 * - includeTotal=true|false, includeRefs=true|false
 */
export const listMouvementsStock = async (req: Request, res: Response) => {
  try {
    const { limit, skip, page } = parsePaging(req);
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const order: Order = (req.query.order as Order) === 'asc' ? 'asc' : 'desc';
    const includeTotal = String(req.query.includeTotal || 'true') === 'true';
    const includeRefs = String(req.query.includeRefs || 'true') === 'true';
    const q = (req.query.q as string) || '';

    const filter = {
      ...buildFilter(req.query),
      ...like(q),
    };

    // Requête principale
    let cursor = MouvementStock.find(filter)
      .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit);

    if (includeRefs) {
      cursor = cursor
        .populate({
          path: 'produit',
          populate: { path: 'categorie', model: 'Categorie' },
        })
        .populate({
          path: 'pointVente',
          populate: { path: 'region', model: 'Region' },
        })
        .populate('region')
        .populate({ path: 'user', select: '-password' });
    }

    const [items, total] = await Promise.all([
      cursor.exec(),
      includeTotal ? MouvementStock.countDocuments(filter) : Promise.resolve(undefined),
    ]);

    // ⚠️ IMPORTANT : ne projetez/pas d’écrasement de champ `type` ici.
    // Pas de `$project: { type: 'Entrée' }` → sinon "Entrée" partout.

    res.json({
      data: items,
      meta: {
        page,          // 0-based
        limit,
        skip,
        total: total ?? items.length,
        sortBy,
        order,
        q,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: 'Erreur interne lors de la récupération des mouvements.',
      error: (err as Error).message,
    });
  }
};

/**
 * GET /mouvements/:id
 */
export const getMouvementById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'ID invalide' });
      return;
    }

    const doc = await MouvementStock.findById(id)
      .populate({
        path: 'produit',
        populate: { path: 'categorie', model: 'Categorie' },
      })
      .populate({
        path: 'pointVente',
        populate: { path: 'region', model: 'Region' },
      })
      .populate('region')
      .populate({ path: 'user', select: '-password' });

    if (!doc) {
      res.status(404).json({ message: 'Mouvement non trouvé' });
      return;
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({
      message: 'Erreur interne lors de la récupération du mouvement.',
      error: (err as Error).message,
    });
  }
};

/**
 * POST /mouvements
 * Body attendu (à adapter à votre schéma) :
 * { produit, quantite, montant, type, user, pointVente?, region?, depotCentral? }
 */
export const createMouvementStock = async (req: Request, res: Response) => {
  try {
    const { produit, quantite, montant, type, user, pointVente, region, depotCentral } = req.body;

    if (!produit || !quantite || !type || !user) {
      res.status(400).json({ message: 'Champs requis manquants (produit, quantite, type, user).' });
      return;
    }

    const mouvement = await new MouvementStock({
      produit,
      quantite,
      montant: montant ?? 0,
      type,
      user,
      pointVente: pointVente || undefined,
      region: region || undefined,
      depotCentral: !!depotCentral,
      statut: false,
    }).save();

    const populated = await MouvementStock.findById(mouvement._id)
      .populate({
        path: 'produit',
        populate: { path: 'categorie', model: 'Categorie' },
      })
      .populate({
        path: 'pointVente',
        populate: { path: 'region', model: 'Region' },
      })
      .populate('region')
      .populate({ path: 'user', select: '-password' });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({
      message: 'Erreur lors de la création du mouvement.',
      error: (err as Error).message,
    });
  }
};

/**
 * PUT /mouvements/:id
 */
export const updateMouvementStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'ID invalide' });
      return;
    }

    const payload = req.body ?? {};
    // Ne JAMAIS forcer ici un `type` constant.

    const updated = await MouvementStock.findByIdAndUpdate(id, payload, { new: true })
      .populate({
        path: 'produit',
        populate: { path: 'categorie', model: 'Categorie' },
      })
      .populate({
        path: 'pointVente',
        populate: { path: 'region', model: 'Region' },
      })
      .populate('region')
      .populate({ path: 'user', select: '-password' });

    if (!updated) {
      res.status(404).json({ message: 'Mouvement non trouvé' });
      return;
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du mouvement.',
      error: (err as Error).message,
    });
  }
};

/**
 * DELETE /mouvements/:id
 */
export const deleteMouvementStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'ID invalide' });
      return;
    }

    const deleted = await MouvementStock.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: 'Mouvement non trouvé' });
      return;
    }

    res.json({ message: 'Mouvement supprimé avec succès' });
  } catch (err) {
    res.status(500).json({
      message: 'Erreur lors de la suppression du mouvement.',
      error: (err as Error).message,
    });
  }
};

/**
 * PATCH /mouvements/:id/validate
 * Valide un mouvement (statut=true). A ajuster si vous mettez à jour un Stock associé ici.
 */
export const validateMouvementStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'ID invalide' });
      return;
    }

    const updated = await MouvementStock.findByIdAndUpdate(
      id,
      { $set: { statut: true } },
      { new: true }
    )
      .populate({
        path: 'produit',
        populate: { path: 'categorie', model: 'Categorie' },
      })
      .populate({
        path: 'pointVente',
        populate: { path: 'region', model: 'Region' },
      })
      .populate('region')
      .populate({ path: 'user', select: '-password' });

    if (!updated) {
      res.status(404).json({ message: 'Mouvement non trouvé' });
      return;
    }

    res.json({ success: true, mouvement: updated });
  } catch (err) {
    res.status(500).json({
      message: 'Erreur lors de la validation du mouvement.',
      error: (err as Error).message,
    });
  }
};

/* ------------------------------ Aggregations ------------------------------- */
/**
 * GET /mouvements/aggregate
 * Params:
 *   groupBy: "produit" | "produit_type"   (par défaut "produit")
 *   page, limit (pagination)
 *   + mêmes filtres que listing: region, pointVente, user, produit, type, statut, depotCentral, dateFrom, dateTo
 *
 * Renvoie: { data: [...], meta }
 * - groupBy=produit       => totalQuantite, totalMontant, count par produit
 * - groupBy=produit_type  => totalQuantite, totalMontant, count par (produit, type)
 */

