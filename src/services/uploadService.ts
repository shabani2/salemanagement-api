import fs from "fs";
import path from "path";
import { Storage } from "@google-cloud/storage";
import { MulterFile } from "../Models/multerType";
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






const storage = new Storage();

export const uploadFile = async (
  file: MulterFile,
  directory: string
): Promise<string> => {
  try {
    // 🚀 Si on est en prod ET que GCS est OK → upload sur GCS
    if (
      process.env.NODE_ENV === "production" &&
      process.env.GOOGLE_BUCKET_NAME &&
      process.env.GCS_ENABLED === "true" // petit flag pour activer/désactiver GCS
    ) {
      const bucketName = process.env.GOOGLE_BUCKET_NAME;
      const bucket = storage.bucket(bucketName);
      const blob = bucket.file(`${directory}/${Date.now()}_${file.originalname}`);
      const blobStream = blob.createWriteStream();

      return new Promise((resolve, reject) => {
        blobStream.on("error", reject);
        blobStream.on("finish", async () => {
          try {
            await blob.makePublic();
            resolve(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
          } catch (err) {
            reject(err);
          }
        });

        if (!file.buffer) {
          reject(new Error("Le fichier n'a pas de buffer à uploader."));
          return;
        }

        blobStream.end(file.buffer);
      });
    }

    // 📦 Sinon → stockage local (même sur Heroku)
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
  } catch (err) {
    console.error("Erreur uploadFile:", err);
    throw err;
  }
};

