"use strict";
// controllers/commandeController.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.printCommande =
  exports.deleteCommande =
  exports.updateCommande =
  exports.createCommande =
  exports.getCommandeById =
  exports.getCommandesByRegion =
  exports.getCommandesByPointVente =
  exports.getCommandesByUser =
  exports.getAllCommandes =
    void 0;
const model_1 = require("../Models/model");
const generateCommandePdf_1 = require("./generateCommandePdf");
const getPaginationOptions = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
const commonPopulate = [
  { path: "user", select: "-password" },
  { path: "region" },
  {
    path: "pointVente",
    populate: { path: "region", model: "Region" },
  },
];
const formatCommande = (commande) =>
  __awaiter(void 0, void 0, void 0, function* () {
    yield commande.populate({
      path: "produits",
      populate: {
        path: "produit",
        model: "Produit",
      },
    });
    let montant = 0;
    let nombreCommandeProduit = 0;
    let livrés = 0;
    commande.produits.forEach((cp) => {
      var _a, _b, _c;
      const prix =
        (_b =
          (_a = cp.produit) === null || _a === void 0 ? void 0 : _a.prix) !==
          null && _b !== void 0
          ? _b
          : 0;
      const quantite = (_c = cp.quantite) !== null && _c !== void 0 ? _c : 0;
      montant += prix * quantite;
      if (cp.statut === "livré") livrés += quantite;
    });
    nombreCommandeProduit += commande.produits.length;
    const tauxLivraison =
      nombreCommandeProduit > 0
        ? Math.round((livrés / nombreCommandeProduit) * 100)
        : 0;
    return Object.assign(Object.assign({}, commande.toObject()), {
      montant,
      nombreCommandeProduit,
      tauxLivraison,
    });
  });
const getAllCommandes = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { skip, limit } = getPaginationOptions(req);
      const commandes = yield model_1.Commande.find()
        .skip(skip)
        .limit(limit)
        .populate("user", "-password")
        .populate("region")
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        });
      const total = yield model_1.Commande.countDocuments();
      const formatted = yield Promise.all(commandes.map(formatCommande));
      res.status(200).json({ total, commandes: formatted });
    } catch (error) {
      res.status(400).json({
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
      const commandes = yield model_1.Commande.find({ user: userId })
        .skip(skip)
        .limit(limit)
        .populate("user", "-password")
        .populate("region")
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        });
      const total = yield model_1.Commande.countDocuments({ user: userId });
      const formatted = yield Promise.all(commandes.map(formatCommande));
      res.status(200).json({ total, commandes: formatted });
    } catch (error) {
      res.status(400).json({
        message: "Erreur lors de la récupération des commandes utilisateur.",
        error: error.message,
      });
    }
  });
exports.getCommandesByUser = getCommandesByUser;
const getCommandesByPointVente = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { pointVenteId } = req.params;
      const { skip, limit } = getPaginationOptions(req);
      const commandes = yield model_1.Commande.find({
        pointVente: pointVenteId,
      })
        .skip(skip)
        .limit(limit)
        .populate("user", "-password")
        .populate("region")
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        });
      const total = yield model_1.Commande.countDocuments({
        pointVente: pointVenteId,
      });
      const formatted = yield Promise.all(commandes.map(formatCommande));
      res.status(200).json({ total, commandes: formatted });
    } catch (error) {
      res.status(400).json({
        message:
          "Erreur lors de la récupération des commandes par point de vente.",
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
      // 1. Récupérer toutes les commandes liées à cette région ou ayant un pointVente
      const commandes = yield model_1.Commande.find({
        $or: [{ region: regionId }, { pointVente: { $ne: null } }],
      })
        .skip(skip)
        .limit(limit)
        .populate(commonPopulate);
      // 2. Filtrer en JS selon la condition réelle de correspondance
      const filtered = commandes.filter((cmd) => {
        var _a, _b, _c;
        return (
          ((_b =
            (_a = cmd.region) === null || _a === void 0 ? void 0 : _a._id) ===
            null || _b === void 0
            ? void 0
            : _b.toString()) === regionId ||
          (cmd.pointVente &&
            typeof cmd.pointVente === "object" &&
            "region" in cmd.pointVente &&
            cmd.pointVente.region &&
            typeof cmd.pointVente.region === "object" &&
            ((_c = cmd.pointVente.region._id) === null || _c === void 0
              ? void 0
              : _c.toString()) === regionId)
        );
      });
      const formatted = yield Promise.all(filtered.map(formatCommande));
      res.status(200).json({ total: filtered.length, commandes: formatted });
    } catch (error) {
      res.status(400).json({
        message: "Erreur lors de la récupération des commandes par région.",
        error: error.message,
      });
    }
  });
exports.getCommandesByRegion = getCommandesByRegion;
const getCommandeById = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const commande = yield model_1.Commande.findById(id)
        .populate("user", "-password")
        .populate("region")
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        });
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
/**
 * POST /commandes
 */
// export const createCommande = async (req: Request, res: Response) => {
//   try {
//     const { user, region, pointVente, depotCentral, produits } = req.body;
//     if (!user || !produits || produits.length === 0) {
//       res
//         .status(400)
//         .json({ message: "L'utilisateur et les produits sont requis." });
//       return;
//     }
//     const hasPointVente = !!pointVente;
//     const hasRegion = !!region;
//     const hasDepotCentral = depotCentral === true;
//     if (!hasPointVente && !hasRegion && !hasDepotCentral) {
//       res
//         .status(400)
//         .json({ message: "La commande doit être liée à une localisation." });
//       return;
//     }
//     // 1. Créer la commande (vide pour le moment)
//     const numero = `CMD-${Date.now()}`;
//     const commande = new Commande({
//       numero,
//       user,
//       region,
//       pointVente,
//       depotCentral,
//       produits: [], // vide au départ
//       statut: "attente",
//     });
//     await commande.save();
//     // 2. Créer les CommandeProduits avec l'ID de la commande
//     const createdCommandeProduits = await Promise.all(
//       produits.map(async (prod: any) => {
//         const created = new CommandeProduit({
//           commandeId: commande._id, // liaison ici
//           produit: prod.produit,
//           quantite: prod.quantite,
//           uniteMesure: prod.uniteMesure,
//           statut: "attente",
//         });
//         await created.save();
//         return created._id;
//       }),
//     );
//     // 3. Mise à jour de la commande avec les produits créés
//     commande.produits = createdCommandeProduits;
//     await commande.save();
//     // 4. Renvoyer la commande peuplée
//     const populated = await Commande.findById(commande._id)
//       .populate("user", "-password")
//       .populate("region")
//       .populate({
//         path: "pointVente",
//         populate: { path: "region", model: "Region" },
//       })
//       .populate({
//         path: "produits",
//         populate: { path: "produit" },
//       });
//     res.status(201).json(populated);
//   } catch (error) {
//     res.status(400).json({
//       message: "Erreur lors de la création de la commande.",
//       error: (error as Error).message,
//     });
//   }
// };
const createCommande = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const {
        user,
        region,
        pointVente,
        depotCentral,
        produits,
        organisation,
        print,
      } = req.body;
      // print: bool optionnel pour forcer le PDF depuis le body
      const wantPdf = req.query.pdf === "1" || print === true;
      if (!user || !produits || produits.length === 0) {
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
      const commande = new model_1.Commande({
        numero,
        user,
        region,
        pointVente,
        depotCentral,
        produits: [],
        statut: "attente",
      });
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
        .populate("user", "-password")
        .populate("region")
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate({
          path: "produits",
          populate: { path: "produit" },
        });
      if (!populated) {
        res
          .status(404)
          .json({ message: "Commande introuvable après création." });
        return;
      }
      // 👉 Si on veut un PDF immédiatement
      if (wantPdf) {
        yield (0, generateCommandePdf_1.renderCommandePdf)(res, populated, {
          organisation,
          format: req.query.format || "pos80",
        });
        return; // on a streamé le PDF
      }
      // Sinon JSON standard
      res.status(201).json(populated);
    } catch (error) {
      res.status(400).json({
        message: "Erreur lors de la création de la commande.",
        error: error.message,
      });
    }
  });
exports.createCommande = createCommande;
/**
 * PUT /commandes/:id
 */
const updateCommande = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
      const { id } = req.params;
      const _b = req.body,
        { produits: produitsUpdates } = _b,
        updateData = __rest(_b, ["produits"]);
      // 1. Mise à jour des champs de la commande (hors produits)
      const commande = yield model_1.Commande.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
        },
      );
      if (!commande) {
        res.status(404).json({ message: "Commande non trouvée." });
        return;
      }
      // 2. Mise à jour des produits, si fournis
      if (Array.isArray(produitsUpdates) && produitsUpdates.length > 0) {
        // On boucle sur les produits mis à jour
        for (const prodUpdate of produitsUpdates) {
          const {
              _id: produitId,
              statut,
              quantite,
              mouvementStockId,
            } = prodUpdate,
            rest = __rest(prodUpdate, [
              "_id",
              "statut",
              "quantite",
              "mouvementStockId",
            ]);
          if (!produitId) {
            // On ignore ou on peut gérer erreur
            continue;
          }
          // Récupération du produit commande à mettre à jour
          const produitCommande =
            yield model_1.CommandeProduit.findById(produitId);
          if (!produitCommande) {
            // Ignore ou collecter erreurs
            continue;
          }
          // Mise à jour des propriétés générales sauf statut (car trigger)
          for (const key in rest) {
            // @ts-ignore
            produitCommande[key] = rest[key];
          }
          // Gestion spéciale du statut
          if (statut && statut !== produitCommande.statut) {
            // Si passage au statut livré, on déclenche la création de mouvement stock
            if (statut === "livré") {
              // Si déjà livré, on skip
              if (produitCommande.statut === "livré") {
                // rien à faire
              } else {
                // Créer le mouvement stock lié
                const mouvementData = {
                  produit: produitCommande.produit,
                  quantite:
                    quantite !== null && quantite !== void 0
                      ? quantite
                      : produitCommande.quantite,
                  montant:
                    (_a = prodUpdate.montant) !== null && _a !== void 0
                      ? _a
                      : 0, // idéalement passé dans prodUpdate
                  type: "Livraison",
                  statut: true,
                  user: updateData.user, // À adapter selon contexte
                  commandeId: commande._id,
                  depotCentral: updateData.depotCentral || false,
                };
                if (updateData.pointVente) {
                  mouvementData.pointVente = updateData.pointVente;
                }
                if (updateData.region) {
                  mouvementData.region = updateData.region;
                }
                const mouvement = new model_1.MouvementStock(mouvementData);
                yield mouvement.save();
                produitCommande.mouvementStockId = mouvement._id;
                produitCommande.statut = "livré";
              }
            } else {
              // Si changement de statut autre que livré, on applique direct
              produitCommande.statut = statut;
            }
          }
          yield produitCommande.save();
        }
      }
      // 3. Recharger tous les produits pour vérifier si tous sont livrés
      const produitsCommande = yield model_1.CommandeProduit.find({
        commande: commande._id,
      });
      const tousLivrés = produitsCommande.every((p) => p.statut === "livré");
      if (tousLivrés && commande.statut !== "livrée") {
        commande.statut = "livrée";
        yield commande.save();
      }
      // 4. Retourner la commande peuplée
      const populated = yield model_1.Commande.findById(commande._id)
        .populate("user", "-password")
        .populate("region")
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate({
          path: "produits",
          populate: { path: "produit" },
        });
      res.status(200).json(populated);
      return;
    } catch (error) {
      res.status(400).json({
        message: "Erreur lors de la mise à jour de la commande.",
        error: error.message,
      });
    }
  });
exports.updateCommande = updateCommande;
/**
 * DELETE /commandes/:id
 */
const deleteCommande = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { id } = req.params;
      const deleted = yield model_1.Commande.findByIdAndDelete(id);
      if (!deleted) res.status(404).json({ message: "Commande non trouvée." });
      res.status(200).json({ message: "Commande supprimée avec succès." });
    } catch (error) {
      res.status(400).json({
        message: "Erreur lors de la suppression.",
        error: error.message,
      });
      return;
    }
  });
exports.deleteCommande = deleteCommande;
// src/controllers/commande.controller.ts (suite)
const printCommande = (req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
      const { id } = req.params;
      const format = req.query.format || "pos80";
      const commande = yield model_1.Commande.findById(id)
        .populate("user", "-password")
        .populate("region")
        .populate({
          path: "pointVente",
          populate: { path: "region", model: "Region" },
        })
        .populate({
          path: "produits",
          populate: { path: "produit" },
        });
      if (!commande) {
        res.status(404).json({ message: "Commande introuvable" });
        return;
      }
      // Optionnel: fournir l'organisation via query, sinon prends celle par défaut côté serveur
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
