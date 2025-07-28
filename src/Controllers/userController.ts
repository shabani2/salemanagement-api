import { Request, Response } from "express";
import { User } from "../Models/model";
import { AuthenticatedRequest } from "../Middlewares/auth";

// Obtenir tous les utilisateurs (SuperAdmin seulement)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find()
      .populate("region") // Région directe de l'utilisateur
      .populate({
        path: "pointVente",
        populate: [
          { path: "region" }, // Région liée au point de vente
          { path: "stock" }, // Stock lié au point de vente
        ],
      })
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    console.error("Erreur dans getAllUsers:", err);
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// Obtenir les utilisateurs d'une région (AdminRegion seulement)
export const getUsersByRegion = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { regionId } = req.user;
    const users = await User.find({ region: regionId })
      .populate({
        path: "pointVente",
        populate: { path: "region" },
      })
      .populate("region");
    const filteredUsers = users.filter(
      (user) =>
        user.region?._id?.toString() === regionId ||
        (user.pointVente &&
          (user.pointVente as any).region?._id?.toString() === regionId),
    );
    res.json(filteredUsers);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// Obtenir les utilisateurs d'un point de vente (AdminPointVente seulement)
export const getUsersByPointVente = async (req: Request, res: Response) => {
  try {
    const { pointVenteId } = req.params;

    if (!pointVenteId) {
      res.status(400).json({ message: "ID du point de vente requis" });
      return;
    }

    const users = await User.find({ pointVente: pointVenteId })
      .populate("region")
      .populate({
        path: "pointVente",
        populate: [{ path: "region" }, { path: "stock" }],
      })
      .sort({ createdAt: -1 });

    res.json(users);
    return;
  } catch (err) {
    console.error("Erreur dans getUsersByPointVente:", err);
    res.status(500).json({ message: "Erreur interne", error: err });
    return;
  }
};

// Supprimer un utilisateur (SuperAdmin, AdminRegion, AdminPointVente selon les droits)
export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "Utilisateur non trouvé" });
      return; // 🔹 Ajout du `return;` pour garantir `void`
    }

    if (
      req.user.role === "SuperAdmin" ||
      (req.user.role === "AdminRegion" && user.region === req.user.regionId) ||
      (req.user.role === "AdminPointVente" &&
        user.pointVente === req.user.pointVente)
    ) {
      await User.findByIdAndDelete(userId);
      res.json({ message: "Utilisateur supprimé avec succès" });
      return; // 🔹 Ajout du `return;` pour éviter l’erreur TypeScript
    }

    res.status(403).json({ message: "Accès refusé" });
    return; // 🔹 Ajout du `return;` pour s'assurer que la fonction ne retourne pas `Response`
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
    return; // 🔹 Ajout du `return;`
  }
};

// Mettre à jour son profil (Tous les utilisateurs)
export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    console.log("🔹 Requête reçue pour mise à jour", req.body);
    console.log("🔹 ID utilisateur:", req.user.userId);

    const {
      _id,
      nom,
      prenom,
      email,
      adresse,
      telephone,
      role,
      image,
      pointVente,
      region,
    } = req.body;

    // Vérifier si l'utilisateur existe avant la mise à jour
    const user = await User.findById(_id);
    if (!user) {
      console.log("❌ Utilisateur non trouvé !");
      res.status(404).json({ message: "Utilisateur non trouvé" });
      return;
    }

    console.log("✅ Utilisateur trouvé:", user);

    const updateFields: Partial<typeof user> = {};

    if (nom) updateFields.nom = nom;
    if (prenom) updateFields.prenom = prenom;
    // if (email) updateFields.email = email;
    if (adresse) updateFields.adresse = adresse;
    if (role) updateFields.role = role;
    if (image) updateFields.image = image;
    if (pointVente) updateFields.pointVente = pointVente;
    if (region) updateFields.region = region;

    // ✅ Vérifier uniquement si le numéro de téléphone a changé
    if (telephone && telephone !== user.telephone) {
      console.log("🔍 Vérification de l'unicité du numéro 1 = ", telephone);
      console.log(
        "🔍 Vérification de l'unicité du numéro 2 = ",
        user.telephone,
      );
      //console.log("🔍 Vérification de l'unicité du numéro...");
      const existingUser =
        (await User.findOne({ telephone })) || (await User.findOne({ email }));
      //const existingUser = await User.findOne({ telephone });

      // ❌ Bloquer seulement si un autre utilisateur a ce numéro
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        console.log("❌ Le numéro de téléphone ou l'amail est déjà utilisé");

        res.status(400).json({
          message: "Le numéro de téléphone ou l'email est déjà utilisé",
        });
        return;
      }

      updateFields.telephone = telephone;
      updateFields.email = telephone;
    }

    console.log("🔹 Champs mis à jour:", updateFields);

    // Si aucun champ n'est modifié, ne rien faire
    if (Object.keys(updateFields).length === 0) {
      console.log("ℹ️ Aucun changement détecté.");

      res.status(200).json({ message: "Aucune modification effectuée." });
      return;
    }

    // Mise à jour de l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      { $set: updateFields },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      console.log("❌ Échec de la mise à jour de l'utilisateur");
      res
        .status(500)
        .json({ message: "Échec de la mise à jour de l'utilisateur" });
      return;
    }

    console.log("✅ Mise à jour réussie:", updatedUser);
    res.json(updatedUser);
  } catch (err) {
    console.error("❌ Erreur lors de la mise à jour de l'utilisateur:", err);
    res.status(500).json({
      message: "Erreur interne",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
