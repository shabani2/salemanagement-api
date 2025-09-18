"use strict";
// /src/controllers/commandeController.ts
// Contrôleur Commande — complet, sans `return res(...)`, avec filtres requestedRegion/requestedPointVente/fournisseur
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
var __rest =
  (this && this.__rest) ||
  function (s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (
          e.indexOf(p[i]) < 0 &&
          Object.prototype.propertyIsEnumerable.call(s, p[i])
        )
          t[p[i]] = s[p[i]];
      }
    return t;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.printCommande =
  exports.deleteCommande =
  exports.updateCommande =
  exports.createCommande =
  exports.getCommandeById =
  exports.getCommandesByFournisseur =
  exports.getCommandesByRequestedPointVente =
  exports.getCommandesByRequestedRegion =
  exports.getCommandesByRegion =
  exports.getCommandesByPointVente =
  exports.getCommandesByUser =
  exports.getAllCommandes =
    void 0;
exports.pickDefined = pickDefined;
const mongoose_1 = __importDefault(require("mongoose"));
const model_1 = require("../Models/model");
const generateCommandePdf_1 = require("./generateCommandePdf");
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
const SOURCE = ["PV", "REGION", "CENTRAL"];
const DESTINATION = ["REGION", "PV", "CENTRAL", "FOURNISSEUR"];
const allowedStatuts = new Set(["attente", "livrée", "annulée"]);
// ---------------------------------------------------------
// Utils
// ---------------------------------------------------------
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const getPaginationOptions = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
const isValidObjectId = (id) =>
  typeof id === "string" && mongoose_1.default.Types.ObjectId.isValid(id);
const parseBool = (v) => (typeof v === "string" ? v === "true" : !!v);
const buildCommandeFilters = (req) => {
  const q = req.query;
  const filter = {};
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
    filter.createdAt = {};
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
function pickDefined(obj) {
  const out = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}
// ---------------------------------------------------------
// Routing rules
// ---------------------------------------------------------
function resolveRouting(body) {
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
  const source = hasReqPV ? "PV" : hasReqReg ? "REGION" : "CENTRAL";
  let destination;
  if (hasFournisseur) destination = "FOURNISSEUR";
  else if (hasDestRegion) destination = "REGION";
  else if (hasDestPV) destination = "PV";
  else destination = "CENTRAL";
  if (source === "PV") {
    if (!["REGION", "CENTRAL", "FOURNISSEUR"].includes(destination)) {
      throw new HttpError(
        400,
        "PV → seulement REGION | CENTRAL | FOURNISSEUR.",
      );
    }
    if (destination === "PV") throw new HttpError(400, "PV → PV interdit.");
  }
  if (source === "REGION") {
    if (!["CENTRAL", "REGION", "PV", "FOURNISSEUR"].includes(destination)) {
      throw new HttpError(
        400,
        "REGION → seulement CENTRAL | REGION | PV | FOURNISSEUR.",
      );
    }
  }
  if (source === "CENTRAL") {
    if (!["REGION", "PV", "FOURNISSEUR"].includes(destination)) {
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
const formatCommande = (commande) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    yield commande.populate({
      path: "produits",
      populate: { path: "produit", model: "Produit" },
    });
    let montant = 0;
    let lignes = 0;
    let lignesLivrees = 0;
    for (const cp of commande.produits) {
      const prix =
        (_b =
          (_a = cp === null || cp === void 0 ? void 0 : cp.produit) === null ||
          _a === void 0
            ? void 0
            : _a.prix) !== null && _b !== void 0
          ? _b
          : 0;
      const quantite =
        (_c = cp === null || cp === void 0 ? void 0 : cp.quantite) !== null &&
        _c !== void 0
          ? _c
          : 0;
      montant += prix * quantite;
      lignes += 1;
      if ((cp === null || cp === void 0 ? void 0 : cp.statut) === "livré")
        lignesLivrees += 1;
    }
    const tauxLivraison =
      lignes > 0 ? Math.round((lignesLivrees / lignes) * 100) : 0;
    return Object.assign(Object.assign({}, commande.toObject()), {
      montant,
      nombreCommandeProduit: lignes,
      tauxLivraison,
    });
  });
// Helper: tri par défaut (pour voir les plus récentes en premier)
const applySort = (req) => {
  const sortBy = req.query.sortBy || "createdAt";
  const order = req.query.order === "asc" ? 1 : -1;
  // pourquoi: _id comme tie-breaker pour stabilité
  return sortBy === "createdAt"
    ? { createdAt: order, _id: order }
    : { [sortBy]: order, _id: -1 };
};
const getAllCommandes = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { skip, limit } = getPaginationOptions(req);
      const filters = buildCommandeFilters(req);
      const sort = applySort(req);
      const [commandes, total] = yield Promise.all([
        model_1.Commande.find(filters)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate(commonPopulate),
        model_1.Commande.countDocuments(filters),
      ]);
      const formatted = yield Promise.all(commandes.map(formatCommande));
      res.status(200).json({ total, commandes: formatted });
    } catch (error) {
      res
        .status(400)
        .json({
          message: "Erreur lors de la récupération des commandes.",
          error: error.message,
        });
    }
  });
exports.getAllCommandes = getAllCommandes;
const getCommandesByUser = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { userId } = req.params;
      const { skip, limit } = getPaginationOptions(req);
      const sort = applySort(req);
      const [commandes, total] = yield Promise.all([
        model_1.Commande.find({ user: userId })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate(commonPopulate),
        model_1.Commande.countDocuments({ user: userId }),
      ]);
      const formatted = yield Promise.all(commandes.map(formatCommande));
      res.status(200).json({ total, commandes: formatted });
    } catch (error) {
      res
        .status(400)
        .json({
          message: "Erreur lors de la récupération des commandes utilisateur.",
          error: error.message,
        });
    }
  });
exports.getCommandesByUser = getCommandesByUser;
// /src/controllers/commandeController.ts  (extraits à remplacer)
// -------------------------- Helpers de portée --------------------------
const buildQueryForPointVente = (pointVenteId) => ({
  $or: [
    { pointVente: pointVenteId }, // destinataire = ce PV
    { requestedPointVente: pointVenteId }, // source = ce PV
  ],
});
const buildQueryForRegion = (regionId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    // IDs des PV rattachés à cette région
    const pvIds = yield model_1.PointVente.find({ region: regionId }).distinct(
      "_id",
    );
    return {
      $or: [
        { region: regionId }, // destinataire = la région
        { requestedRegion: regionId }, // source = la région
        { pointVente: { $in: pvIds } }, // destinataire = PV de la région
        { requestedPointVente: { $in: pvIds } }, // source = PV de la région
      ],
    };
  });
// -------------------------- Handlers mis à jour --------------------------
const getCommandesByPointVente = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { pointVenteId } = req.params;
      const { skip, limit } = getPaginationOptions(req);
      const sort = applySort(req);
      if (!isValidObjectId(pointVenteId)) {
        res.status(400).json({ message: "Paramètre pointVenteId invalide." });
        return;
      }
      const query = buildQueryForPointVente(pointVenteId);
      const [commandes, total] = yield Promise.all([
        model_1.Commande.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate(commonPopulate),
        model_1.Commande.countDocuments(query),
      ]);
      const formatted = yield Promise.all(commandes.map(formatCommande));
      res
        .status(200)
        .json({
          total,
          commandes: formatted,
          page: Math.floor(skip / limit) + 1,
          limit,
        });
    } catch (error) {
      res.status(400).json({
        message:
          "Erreur lors de la récupération des commandes par point de vente (source ou destination).",
        error: error.message,
      });
    }
  });
exports.getCommandesByPointVente = getCommandesByPointVente;
const getCommandesByRegion = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { regionId } = req.params;
      const { skip, limit } = getPaginationOptions(req);
      const sort = applySort(req);
      if (!isValidObjectId(regionId)) {
        res.status(400).json({ message: "Paramètre regionId invalide." });
        return;
      }
      const query = yield buildQueryForRegion(regionId);
      const [commandes, total] = yield Promise.all([
        model_1.Commande.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate(commonPopulate),
        model_1.Commande.countDocuments(query),
      ]);
      const formatted = yield Promise.all(commandes.map(formatCommande));
      res
        .status(200)
        .json({
          total,
          commandes: formatted,
          page: Math.floor(skip / limit) + 1,
          limit,
        });
    } catch (error) {
      res.status(400).json({
        message:
          "Erreur lors de la récupération des commandes par région (source ou destination).",
        error: error.message,
      });
    }
  });
exports.getCommandesByRegion = getCommandesByRegion;
const getCommandesByRequestedRegion = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { requestedRegionId } = req.params;
      const { skip, limit } = getPaginationOptions(req);
      const sort = applySort(req);
      const [commandes, total] = yield Promise.all([
        model_1.Commande.find({ requestedRegion: requestedRegionId })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate(commonPopulate),
        model_1.Commande.countDocuments({ requestedRegion: requestedRegionId }),
      ]);
      const formatted = yield Promise.all(commandes.map(formatCommande));
      res.status(200).json({ total, commandes: formatted });
    } catch (error) {
      res
        .status(400)
        .json({
          message:
            "Erreur lors des commandes par région source (requestedRegion).",
          error: error.message,
        });
    }
  });
exports.getCommandesByRequestedRegion = getCommandesByRequestedRegion;
const getCommandesByRequestedPointVente = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { requestedPointVenteId } = req.params;
      const { skip, limit } = getPaginationOptions(req);
      const sort = applySort(req);
      const [commandes, total] = yield Promise.all([
        model_1.Commande.find({ requestedPointVente: requestedPointVenteId })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate(commonPopulate),
        model_1.Commande.countDocuments({
          requestedPointVente: requestedPointVenteId,
        }),
      ]);
      const formatted = yield Promise.all(commandes.map(formatCommande));
      res.status(200).json({ total, commandes: formatted });
    } catch (error) {
      res
        .status(400)
        .json({
          message:
            "Erreur lors des commandes par point de vente source (requestedPointVente).",
          error: error.message,
        });
    }
  });
exports.getCommandesByRequestedPointVente = getCommandesByRequestedPointVente;
const getCommandesByFournisseur = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { fournisseurId } = req.params;
      const { skip, limit } = getPaginationOptions(req);
      const sort = applySort(req);
      const [commandes, total] = yield Promise.all([
        model_1.Commande.find({ fournisseur: fournisseurId })
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate(commonPopulate),
        model_1.Commande.countDocuments({ fournisseur: fournisseurId }),
      ]);
      const formatted = yield Promise.all(commandes.map(formatCommande));
      res.status(200).json({ total, commandes: formatted });
    } catch (error) {
      res
        .status(400)
        .json({
          message: "Erreur lors des commandes par fournisseur.",
          error: error.message,
        });
    }
  });
exports.getCommandesByFournisseur = getCommandesByFournisseur;
// ---------------------------------------------------------
// Handlers
// ---------------------------------------------------------
const getCommandeById = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const commande = yield model_1.Commande.findById(id)
        .populate(commonPopulate)
        .populate({ path: "produits", populate: { path: "produit" } });
      if (!commande) {
        res.status(404).json({ message: "Commande non trouvée." });
        return;
      }
      const formatted = yield formatCommande(commande);
      res.status(200).json(formatted);
    } catch (error) {
      res.status(400).json({
        message: "Erreur lors de la récupération de la commande.",
        error: error.message,
      });
    }
  });
exports.getCommandeById = getCommandeById;
// const pickDefined = <T extends Record<string, any>>(obj: T): Partial<T> =>
//   Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
const isValidProductItem = (it) =>
  it &&
  it.produit &&
  mongoose_1.default.Types.ObjectId.isValid(String(it.produit)) &&
  Number(it.quantite) > 0;
const assertProduitsOr400 = (req, res) => {
  var _a;
  const produits =
    (_a = req.body) === null || _a === void 0 ? void 0 : _a.produits;
  if (!Array.isArray(produits) || produits.length === 0) {
    res
      .status(400)
      .json({
        message:
          "Les produits sont requis et doivent être un tableau non vide.",
      });
    return { ok: false };
  }
  if (!produits.every(isValidProductItem)) {
    res
      .status(400)
      .json({
        message:
          "Chaque produit doit contenir { produit:ObjectId, quantite>0 }.",
      });
    return { ok: false };
  }
  return { ok: true };
};
const createCommande = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
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
        produits: [],
        statut: "attente",
      });
      const commande = new model_1.Commande(toCreate);
      yield commande.save();
      const createdCommandeProduits = yield Promise.all(
        produits.map((prod) =>
          __awaiter(void 0, void 0, void 0, function* () {
            const created = new model_1.CommandeProduit({
              commandeId: commande._id,
              produit: prod.produit,
              quantite: prod.quantite,
              statut: "attente",
            });
            yield created.save();
            return created._id;
          }),
        ),
      );
      commande.produits = createdCommandeProduits;
      yield commande.save();
      const populated = yield model_1.Commande.findById(commande._id)
        .populate(commonPopulate)
        .populate({ path: "produits", populate: { path: "produit" } });
      if (!populated) {
        res
          .status(404)
          .json({ message: "Commande introuvable après création." });
        return;
      }
      if (wantPdf) {
        yield (0, generateCommandePdf_1.renderCommandePdf)(res, populated, {
          organisation,
          format: req.query.format || "pos80",
        });
        return;
      }
      res.status(201).json(populated);
    } catch (error) {
      const status =
        (error === null || error === void 0 ? void 0 : error.status) || 400;
      res.status(status).json({
        message: "Erreur lors de la création de la commande.",
        error: error.message,
      });
    }
  });
exports.createCommande = createCommande;
const updateCommande = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
      const { id } = req.params;
      const _c = req.body,
        { produits: produitsUpdates } = _c,
        updateDataRaw = __rest(_c, ["produits"]);
      const existing = yield model_1.Commande.findById(id);
      if (!existing) {
        res.status(404).json({ message: "Commande non trouvée." });
        return;
      }
      // On ne force aucun champ optionnel: on applique seulement les clés définies
      const updateData = pickDefined({
        user: updateDataRaw.user,
        region: updateDataRaw.region,
        pointVente: updateDataRaw.pointVente,
        requestedRegion: updateDataRaw.requestedRegion,
        requestedPointVente: updateDataRaw.requestedPointVente,
        fournisseur: updateDataRaw.fournisseur,
        depotCentral: updateDataRaw.depotCentral,
        statut: updateDataRaw.statut,
        numero: updateDataRaw.numero, // si jamais vous autorisez l’édition
      });
      const preview = Object.assign(
        Object.assign({}, existing.toObject()),
        updateData,
      );
      resolveRouting(preview);
      const commande = yield model_1.Commande.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true },
      );
      if (!commande) {
        res.status(404).json({ message: "Commande non trouvée." });
        return;
      }
      if (Array.isArray(produitsUpdates) && produitsUpdates.length > 0) {
        for (const prodUpdate of produitsUpdates) {
          const _d = prodUpdate || {},
            { _id: produitId, statut, quantite } = _d,
            rest = __rest(_d, ["_id", "statut", "quantite"]);
          if (!produitId) continue;
          const produitCommande =
            yield model_1.CommandeProduit.findById(produitId);
          if (!produitCommande) continue;
          // Mises à jour partielles sur l'item
          for (const [k, v] of Object.entries(rest)) {
            produitCommande[k] = v;
          }
          if (typeof quantite === "number" && quantite > 0) {
            produitCommande.quantite = quantite;
          }
          // Passage en "livré" => MouvementStock
          if (statut && statut !== produitCommande.statut) {
            if (statut === "livré") {
              if (produitCommande.statut !== "livré") {
                const mouvementData = {
                  produit: produitCommande.produit,
                  quantite:
                    typeof quantite === "number" && quantite > 0
                      ? quantite
                      : produitCommande.quantite,
                  montant:
                    (_a = prodUpdate.montant) !== null && _a !== void 0
                      ? _a
                      : 0,
                  type: "Livraison",
                  statut: true,
                  user:
                    (_b = updateData.user) !== null && _b !== void 0
                      ? _b
                      : existing.user, // fallback
                  commandeId: commande._id,
                  depotCentral: !!(preview.depotCentral || false),
                };
                if (preview.pointVente)
                  mouvementData.pointVente = preview.pointVente;
                if (preview.region) mouvementData.region = preview.region;
                const mouvement = new model_1.MouvementStock(mouvementData);
                yield mouvement.save();
                produitCommande.mouvementStockId = mouvement._id;
                produitCommande.statut = "livré";
              }
            } else {
              produitCommande.statut = statut;
            }
          }
          yield produitCommande.save();
        }
      }
      const produitsCommande = yield model_1.CommandeProduit.find({
        commandeId: commande._id,
      });
      const tousLivres =
        produitsCommande.length > 0 &&
        produitsCommande.every((p) => p.statut === "livré");
      if (tousLivres && commande.statut !== "livrée") {
        commande.statut = "livrée";
        yield commande.save();
      }
      const populated = yield model_1.Commande.findById(commande._id)
        .populate(commonPopulate)
        .populate({ path: "produits", populate: { path: "produit" } });
      res.status(200).json(populated);
    } catch (error) {
      const status =
        (error === null || error === void 0 ? void 0 : error.status) || 400;
      res.status(status).json({
        message: "Erreur lors de la mise à jour de la commande.",
        error: error.message,
      });
    }
  });
exports.updateCommande = updateCommande;
const deleteCommande = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const deleted = yield model_1.Commande.findByIdAndDelete(id);
      if (!deleted) {
        res.status(404).json({ message: "Commande non trouvée." });
        return;
      }
      res.status(200).json({ message: "Commande supprimée avec succès." });
    } catch (error) {
      res.status(400).json({
        message: "Erreur lors de la suppression.",
        error: error.message,
      });
    }
  });
exports.deleteCommande = deleteCommande;
const printCommande = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
      const { id } = req.params;
      const format = req.query.format || "pos80";
      const commande = yield model_1.Commande.findById(id)
        .populate(commonPopulate)
        .populate({ path: "produits", populate: { path: "produit" } });
      if (!commande) {
        res.status(404).json({ message: "Commande introuvable" });
        return;
      }
      const organisation =
        ((_a = req.body) === null || _a === void 0
          ? void 0
          : _a.organisation) || null;
      yield (0, generateCommandePdf_1.renderCommandePdf)(res, commande, {
        organisation,
        format,
      });
    } catch (error) {
      res.status(500).json({
        message: "Erreur lors de l'impression du bon de commande.",
        error: error.message,
      });
    }
  });
exports.printCommande = printCommande;
