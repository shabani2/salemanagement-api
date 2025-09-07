"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustStock = void 0;
exports.computeLivraisonScopes = computeLivraisonScopes;
exports.computeOperationSource = computeOperationSource;
exports.attachMouvementHooks = attachMouvementHooks;
const model_1 = require("../Models/model");
// --- FIX: empêcher les stocks négatifs en décrément ---
const adjustStock = (filter, qtyChange, montantChange) => __awaiter(void 0, void 0, void 0, function* () {
    if (qtyChange < 0) {
        const res = yield model_1.Stock.findOneAndUpdate(Object.assign(Object.assign({}, filter), { quantite: { $gte: Math.abs(qtyChange) } }), { $inc: { quantite: qtyChange, montant: montantChange } }, { new: true, upsert: false })
            .lean()
            .exec();
        if (!res)
            throw new Error("Stock insuffisant: opération rejetée (négatif interdit)");
        return;
    }
    yield model_1.Stock.findOneAndUpdate(filter, {
        $inc: { quantite: qtyChange, montant: montantChange },
        $setOnInsert: { produit: filter.produit },
    }, { upsert: true, new: true, setDefaultsOnInsert: true }).exec();
});
exports.adjustStock = adjustStock;
// Détermine la source/destination d’une livraison selon les règles
function computeLivraisonScopes(doc) {
    const { produit, depotCentral, region, pointVente } = doc;
    // (1) Cas prioritaire demandé: région -> point de vente
    if (region && pointVente) {
        return {
            source: { produit, region },
            destination: { produit, pointVente },
        };
    }
    // (2) depotCentral=true => source = central; destination = region || pointVente (si fourni)
    if (depotCentral === true) {
        return {
            source: { produit, depotCentral: true },
            destination: pointVente
                ? { produit, pointVente }
                : region
                    ? { produit, region }
                    : undefined,
        };
    }
    // (3) region seul => source = region; destination = (pointVente ?) sinon undefined
    if (region) {
        return {
            source: { produit, region },
            destination: pointVente ? { produit, pointVente } : undefined,
        };
    }
    // (4) pointVente seul => destination=pointVente (utile pour crédit à l'update quand le doc n'a plus region)
    if (pointVente && !region && !depotCentral) {
        return { destination: { produit, pointVente } };
    }
    return {
        reasonIfInvalid: "Livraison invalide: préciser depotCentral=true ou region.",
    };
}
// Source d’une Vente/Sortie (inchangé)
function computeOperationSource(doc) {
    const { produit, depotCentral, region, pointVente } = doc;
    if (depotCentral === true)
        return { source: { produit, depotCentral: true } };
    if (region)
        return { source: { produit, region } };
    if (pointVente)
        return { source: { produit, pointVente } };
    return {
        reasonIfInvalid: "Opération invalide: préciser l’emplacement (depotCentral/region/pointVente).",
    };
}
// -----------------
// HOOKS fournis (avec corrections ciblées)
// -----------------
function attachMouvementHooks(MouvementStockSchema) {
    // PRE SAVE
    MouvementStockSchema.pre("save", function (next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { type, statut, quantite } = this;
                // Entrée & Commande: pas de contrôle de dispo
                if (type === "Entrée" || type === "Commande")
                    return next();
                // LIVRAISON: vérifier le stock de la *source* uniquement
                if (type === "Livraison") {
                    // Calcul à partir de l'état entrant
                    const { source, destination, reasonIfInvalid } = computeLivraisonScopes(this);
                    if (!source)
                        return next(new Error(reasonIfInvalid || "Livraison invalide"));
                    const srcStock = yield model_1.Stock.findOne(source).lean().exec();
                    if (!srcStock || srcStock.quantite < quantite) {
                        return next(new Error("Stock source insuffisant pour la livraison"));
                    }
                    // *** FIX demandé ***
                    // Si on reçoit regionId + pointVenteId, on rattache le mouvement *au point de vente* :
                    // - on mémorise les portées pour post-save
                    // - on reset `region` pour que le doc sauvegardé appartienne au pointVente
                    const hadRegionAndPV = !!(this.region && this.pointVente);
                    if (hadRegionAndPV) {
                        this._livraisonScopes = { source, destination };
                        (_b = (_a = this).set) === null || _b === void 0 ? void 0 : _b.call(_a, "region", undefined);
                        this.region = undefined;
                    }
                    return next();
                }
                // VENTE / SORTIE: vérifier la source selon depotCentral/region/pointVente
                if (["Vente", "Sortie"].includes(type)) {
                    const { source, reasonIfInvalid } = computeOperationSource(this);
                    if (!source)
                        return next(new Error(reasonIfInvalid || "Portée invalide"));
                    if (statut) {
                        const s = yield model_1.Stock.findOne(source).lean().exec();
                        if (!s || s.quantite < quantite) {
                            return next(new Error("Stock insuffisant pour l'opération"));
                        }
                    }
                    return next();
                }
                next();
            }
            catch (error) {
                next(error);
            }
        });
    });
    // POST SAVE
    MouvementStockSchema.post("save", function (doc) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { produit, quantite, type, statut, montant, transferApplied, } = doc;
                // ENTRÉE: on crédite directement la destination (region sinon central)
                if (type === "Entrée") {
                    if (doc.region)
                        yield (0, exports.adjustStock)({ produit, region: doc.region }, quantite, montant);
                    else
                        yield (0, exports.adjustStock)({ produit, depotCentral: true }, quantite, montant);
                    return;
                }
                // Pour les autres, si statut falsy et type !== Livraison, on ne touche pas (comportement existant)
                if (!statut && type !== "Livraison")
                    return;
                // VENTE / SORTIE: décrémente la source quand statut=true
                if (["Vente", "Sortie"].includes(type)) {
                    const { source, reasonIfInvalid } = computeOperationSource(doc);
                    if (!source)
                        return console.error(reasonIfInvalid);
                    yield (0, exports.adjustStock)(source, -quantite, -montant);
                    return;
                }
                // LIVRAISON:
                if (type === "Livraison") {
                    // Utiliser les portées mémorisées si la région a été reset en pre-save
                    const memo = doc._livraisonScopes;
                    //@ts-ignore
                    const { source, destination, reasonIfInvalid } = memo !== null && memo !== void 0 ? memo : computeLivraisonScopes(doc);
                    if (!source)
                        return console.error(reasonIfInvalid);
                    // 1) Toujours décrémenter la source immédiatement
                    yield (0, exports.adjustStock)(source, -quantite, -montant);
                    // 2) Crédite la destination *seulement* si statut=true au moment de la création
                    if (statut && destination && !transferApplied) {
                        yield (0, exports.adjustStock)(destination, quantite, montant);
                        // Marquer comme appliqué pour éviter double crédit à l’update
                        yield doc.constructor.updateOne({ _id: doc._id, transferApplied: { $ne: true } }, { $set: { transferApplied: true } });
                    }
                }
            }
            catch (err) {
                console.error("Erreur post-save MouvementStock:", err);
            }
        });
    });
    // PRE UPDATE
    MouvementStockSchema.pre("findOneAndUpdate", function (next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._oldDoc = yield this.model
                    .findOne(this.getQuery())
                    .lean()
                    .exec();
                next();
            }
            catch (e) {
                next(e);
            }
        });
    });
    // POST UPDATE
    MouvementStockSchema.post("findOneAndUpdate", function (resDoc) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!resDoc)
                    return;
                const oldDoc = this._oldDoc;
                const newDoc = yield this.model.findById(resDoc._id).lean().exec();
                if (!oldDoc || !newDoc)
                    return;
                // Transition false -> true ?
                const wasFalse = !oldDoc.statut;
                const isTrue = !!newDoc.statut;
                if (newDoc.type !== "Livraison")
                    return;
                if (!(wasFalse && isTrue))
                    return;
                // Créditer la destination si pas encore fait
                if (newDoc.transferApplied)
                    return;
                const { destination, reasonIfInvalid } = computeLivraisonScopes(newDoc);
                if (!destination) {
                    console.error(reasonIfInvalid || "Livraison sans destination à l’update");
                    return;
                }
                yield (0, exports.adjustStock)(destination, newDoc.quantite, newDoc.montant);
                yield this.model.updateOne({ _id: newDoc._id, transferApplied: { $ne: true } }, { $set: { transferApplied: true } });
            }
            catch (err) {
                console.error("Erreur post-update MouvementStock:", err);
            }
        });
    });
}
