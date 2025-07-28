// // controllers/organisationController.ts

// import fs from "fs";
// import path from "path";
// import { Request, Response } from "express";
// import { Organisations } from "../Models/model";

// // 🔹 Obtenir toutes les organisations
// export const getAllOrganisations = async (req: Request, res: Response) => {
//   try {
//     const organisations = await Organisations.find().populate("superAdmin");
//     res.json(organisations);
//   } catch (err) {
//     res.status(500).json({ message: "Erreur interne", error: err });
//   }
// };

// // 🔹 Obtenir une organisation par ID
// export const getOrganisationById = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const organisation =
//       await Organisations.findById(id).populate("superAdmin");

//     if (!organisation) {
//       res.status(404).json({ message: "Organisation non trouvée" });
//       return;
//     }

//     res.json(organisation);
//     return;
//   } catch (err) {
//     res.status(500).json({ message: "Erreur interne", error: err });
//     return;
//   }
// };

// // 🔹 Créer une organisation avec upload de logo
// export const createOrganisation = async (req: Request, res: Response) => {
//   try {
//     const {
//       nom,
//       rccm,
//       contact,
//       siegeSocial,
//       devise,
//       superAdmin,
//       pays,
//       emailEntreprise,
//     } = req.body;

//     let logoPath = "";
//     const orgDir = path.join(__dirname, "./../assets/organisations");

//     if (!fs.existsSync(orgDir)) {
//       fs.mkdirSync(orgDir, { recursive: true });
//     }

//     if (req.file) {
//       logoPath = `../assets/organisations/${req.file.filename}`;
//       const destination = path.join(orgDir, req.file.filename);
//       fs.renameSync(req.file.path, destination);
//     }

//     const organisation = new Organisations({
//       nom,
//       rccm,
//       contact,
//       siegeSocial,
//       logo: logoPath,
//       devise,
//       superAdmin,
//       pays,
//       emailEntreprise,
//     });

//     await organisation.save();
//     res.status(201).json(organisation);
//   } catch (err) {
//     res.status(400).json({ message: "Erreur lors de la création", error: err });
//   }
// };

// // 🔹 Mettre à jour une organisation
// export const updateOrganisation = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const updateData = req.body;

//     const updated = await Organisations.findByIdAndUpdate(id, updateData, {
//       new: true,
//       runValidators: true,
//     }).populate("superAdmin");

//     if (!updated) {
//       res.status(404).json({ message: "Organisation non trouvée" });
//       return;
//     }

//     res.json(updated);
//     return;
//   } catch (err) {
//     res.status(400).json({ message: "Erreur de mise à jour", error: err });
//     return;
//   }
// };

// // 🔹 Supprimer une organisation
// export const deleteOrganisation = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     await Organisations.findByIdAndDelete(id);
//     res.json({ message: "Organisation supprimée" });
//   } catch (err) {
//     res.status(500).json({ message: "Erreur interne", error: err });
//   }
// };

// // 🔹 Récupérer le logo de la première organisation
// export const getDefaultOrganisationLogo = async (
//   req: Request,
//   res: Response,
// ) => {
//   try {
//     const organisation = await Organisations.findOne().sort({ _id: 1 });

//     if (!organisation) {
//       res.status(404).json({ message: "Aucune organisation trouvée" });
//       return;
//     }

//     if (!organisation.logo) {
//       res
//         .status(404)
//         .json({ message: "Aucun logo défini pour cette organisation" });
//       return;
//     }

//     const filename = path.basename(organisation.logo);
//     const publicPath = `/assets/organisations/${filename}`;

//     res.json({ logoUrl: publicPath });
//   } catch (err) {
//     res.status(500).json({ message: "Erreur interne", error: err });
//   }
// };

// controllers/organisationController.ts

import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { Organisations } from "../Models/model";

// 🔹 Obtenir toutes les organisations
export const getAllOrganisations = async (req: Request, res: Response) => {
  try {
    const organisations = await Organisations.find().populate("superAdmin");
    res.json(organisations);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Obtenir une organisation par ID
export const getOrganisationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organisation =
      await Organisations.findById(id).populate("superAdmin");

    if (!organisation) {
      res.status(404).json({ message: "Organisation non trouvée" });
      return;
    }

    res.json(organisation);
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Créer une organisation avec upload de logo
export const createOrganisation = async (req: Request, res: Response) => {
  try {
    const {
      nom,
      idNat,
      contact,
      numeroImpot,
      devise,
      superAdmin,
      pays,
      emailEntreprise,
    } = req.body;

    let logoPath = "";
    const orgDir = path.join(__dirname, "./../assets/organisations");

    if (!fs.existsSync(orgDir)) {
      fs.mkdirSync(orgDir, { recursive: true });
    }

    if (req.file) {
      logoPath = `../assets/organisations/${req.file.filename}`;
      const destination = path.join(orgDir, req.file.filename);
      fs.renameSync(req.file.path, destination);
    }

    const organisation = new Organisations({
      nom,
      idNat,
      contact,
      numeroImpot,
      logo: logoPath,
      devise,
      superAdmin,
      pays,
      emailEntreprise,
    });

    await organisation.save();
    res.status(201).json(organisation);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création", error: err });
  }
};

// 🔹 Mettre à jour une organisation
export const updateOrganisation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await Organisations.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("superAdmin");

    if (!updated) {
      res.status(404).json({ message: "Organisation non trouvée" });
      return;
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Erreur de mise à jour", error: err });
  }
};

// 🔹 Supprimer une organisation
export const deleteOrganisation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Organisations.findByIdAndDelete(id);
    res.json({ message: "Organisation supprimée" });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};

// 🔹 Récupérer le logo de la première organisation
export const getDefaultOrganisationLogo = async (
  req: Request,
  res: Response,
) => {
  try {
    const organisation = await Organisations.findOne().sort({ _id: 1 });

    if (!organisation) {
      res.status(404).json({ message: "Aucune organisation trouvée" });
      return;
    }

    if (!organisation.logo) {
      res
        .status(404)
        .json({ message: "Aucun logo défini pour cette organisation" });
      return;
    }

    const filename = path.basename(organisation.logo);
    const publicPath = `/assets/organisations/${filename}`;

    res.json({ logoUrl: publicPath });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne", error: err });
  }
};
