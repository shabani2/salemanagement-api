import { Storage } from "@google-cloud/storage";
import path from "path";
import fs from "fs";
import { MulterFile } from "../Models/multerType";
import { getGoogleCredentialsFile } from "../Utils/getGcpCredentials";

// Création unique de l'instance Storage
let storage: Storage;
if (process.env.NODE_ENV === "production") {
  const keyFilename = getGoogleCredentialsFile();
  storage = new Storage({ keyFilename });
} else {
  storage = new Storage();
}

/**
 * Upload d'un fichier en local (développement) ou sur GCS (production)
 */
export const uploadFile = async (
  file: MulterFile,
  directory: string
): Promise<string> => {
  // LOCAL
  if (process.env.NODE_ENV !== "production") {
    const uploadDir = path.join(__dirname, `../../assets/${directory}`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (!file.path) {
      throw new Error("Le fichier n'a pas de chemin local 'path'.");
    }

    const destinationPath = path.join(uploadDir, file.filename);
    fs.renameSync(file.path, destinationPath);

    return `assets/${directory}/${file.filename}`;
  }

  // PRODUCTION
  const bucketName = process.env.GOOGLE_BUCKET_NAME;
  if (!bucketName) throw new Error("Bucket name non configuré");

  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(`${directory}/${Date.now()}_${file.originalname}`);
  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype || "application/octet-stream",
  });

  return new Promise((resolve, reject) => {
    blobStream.on("error", (err) => {
      console.error("Erreur lors de l'upload vers GCS:", err);
      reject(err);
    });

    blobStream.on("finish", async () => {
      try {
        await blob.makePublic();
        resolve(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
      } catch (error) {
        console.error("Erreur lors de la mise en public du fichier:", error);
        reject(error);
      }
    });

    // En prod → multer.memoryStorage() → file.buffer doit exister
    if (file.buffer) {
      blobStream.end(file.buffer);
      return;
    }

    // Sécurité : si file.buffer absent, essayer via chemin disque
    if (file.path && fs.existsSync(file.path)) {
      fs.createReadStream(file.path).pipe(blobStream);
      return;
    }

    reject(new Error("Le fichier n'a ni buffer ni chemin local pour l'upload."));
  });
};

/**
 * Suppression d'un fichier en local ou sur GCS
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  // LOCAL
  if (process.env.NODE_ENV !== "production") {
    const fullPath = path.join(__dirname, `../../${filePath}`);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return;
  }

  // PRODUCTION
  const bucketName = process.env.GOOGLE_BUCKET_NAME;
  if (!bucketName) throw new Error("Bucket name non configuré");

  const fileName = filePath.replace(
    `https://storage.googleapis.com/${bucketName}/`,
    ""
  );

  try {
    await storage.bucket(bucketName).file(fileName).delete();
  } catch (err) {
    console.error("Erreur lors de la suppression du fichier sur GCS:", err);
  }
};
