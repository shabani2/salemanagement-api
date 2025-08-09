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

export const uploadFile = async (
  file: MulterFile,
  directory: string
): Promise<string> => {
  // Mode développement: sauvegarde locale
  if (process.env.NODE_ENV !== "production") {
    const uploadDir = path.join(__dirname, `../../assets/${directory}`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const destinationPath = path.join(uploadDir, file.filename);
    fs.renameSync(file.path, destinationPath);
    return `assets/${directory}/${file.filename}`;
  }

  // Mode production: upload vers GCS
  const bucketName = process.env.GOOGLE_BUCKET_NAME;
  if (!bucketName) throw new Error("Bucket name non configuré");

  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(`${directory}/${Date.now()}_${file.originalname}`);
  const blobStream = blob.createWriteStream();

  return new Promise((resolve, reject) => {
    blobStream.on("error", reject);

    blobStream.on("finish", async () => {
      try {
        await blob.makePublic();
        resolve(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
      } catch (error) {
        reject(error);
      }
    });

    blobStream.end(file.buffer);
  });
};

export const deleteFile = async (filePath: string): Promise<void> => {
  // Mode développement: suppression locale
  if (process.env.NODE_ENV !== "production") {
    const fullPath = path.join(__dirname, `../../${filePath}`);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return;
  }

  // Mode production: suppression depuis GCS
  const bucketName = process.env.GOOGLE_BUCKET_NAME;
  if (!bucketName) throw new Error("Bucket name non configuré");

  // Extraction du nom du fichier depuis l'URL
  const fileName =
    filePath
      .replace(`https://storage.googleapis.com/${bucketName}/`, "")
      .trim();

  await storage.bucket(bucketName).file(fileName).delete();
};
