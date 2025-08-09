import { Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

let storage: multer.StorageEngine;

if (process.env.NODE_ENV === "production") {
  // En prod : stockage en mémoire pour envoyer vers GCS
  storage = multer.memoryStorage();
} else {
  // En local : stockage sur disque avec dossier par rôle
  storage = multer.diskStorage({
    destination: (req: Request, file, cb) => {
      const role = (req.body as { role?: string }).role || "default";
      const uploadDir = path.join(__dirname, `../../assets/${role}`);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
    },
  });
}

export const upload = multer({ storage });
