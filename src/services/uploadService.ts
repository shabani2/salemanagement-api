import fs from "fs";
import path from "path";
import { Storage } from "@google-cloud/storage";
import { MulterFile } from "../Models/multerType";
import { getGoogleCredentialsFile } from "../Utils/getGcpCredentials";

// Instance unique de GCS
let storage: Storage;
if (process.env.NODE_ENV === "production" && process.env.GOOGLE_BUCKET_NAME) {
  try {
    const keyFilename = getGoogleCredentialsFile();
    storage = new Storage({ keyFilename });
  } catch (err) {
    console.warn("⚠ Google Cloud Storage désactivé : credentials manquants.");
  }
}
export const uploadFile = async (
  file: MulterFile,
  directory: string,
): Promise<string> => {
  try {
    // 📦 Sauvegarde locale (Heroku inclus)
    const uploadDir = path.join(__dirname, `../assets/${directory}`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Cas 1 : multer.diskStorage → file.path existe
    if (file.path) {
      const destinationPath = path.join(uploadDir, file.filename);
      fs.renameSync(file.path, destinationPath);
      return `assets/${directory}/${file.filename}`;
    }

    // Cas 2 : multer.memoryStorage → file.buffer existe
    if (file.buffer) {
      const destinationPath = path.join(uploadDir, file.originalname);
      fs.writeFileSync(destinationPath, file.buffer);
      return `assets/${directory}/${file.originalname}`;
    }

    throw new Error("Le fichier n'a ni buffer ni chemin local.");
  } catch (err) {
    console.error("Erreur uploadFile:", err);
    throw err;
  }
};

/**
 * Suppression d'un fichier en local ou sur GCS
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    // 1️⃣ Suppression locale (Heroku inclus)
    const localPath = path.join(__dirname, `../../${filePath}`);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      return;
    }

    // 2️⃣ Suppression sur Google Cloud Storage si configuré
    if (storage && process.env.GOOGLE_BUCKET_NAME) {
      const bucketName = process.env.GOOGLE_BUCKET_NAME;
      const fileName = filePath.replace(
        `https://storage.googleapis.com/${bucketName}/`,
        "",
      );

      await storage.bucket(bucketName).file(fileName).delete();
    }
  } catch (err) {
    console.error("Erreur lors de la suppression du fichier:", err);
  }
};
