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
  // Mode développement/local : stockage sur disque
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

  // Mode production : upload vers Google Cloud Storage
  const bucketName = process.env.GOOGLE_BUCKET_NAME;
  if (!bucketName) throw new Error("Bucket name non configuré");

  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(`${directory}/${Date.now()}_${file.originalname}`);
  const blobStream = blob.createWriteStream();

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

    // Cas 1 : le fichier est en mémoire (memoryStorage)
    if (file.buffer) {
      blobStream.end(file.buffer);
      return;
    }

    // Cas 2 : le fichier est sur disque (diskStorage)
    if (file.path && fs.existsSync(file.path)) {
      fs.createReadStream(file.path).pipe(blobStream);
      return;
    }

    // Cas 3 : aucun des deux → erreur
    reject(new Error("Le fichier n'a ni buffer ni chemin local pour l'upload."));
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
  const fileName = filePath
    .replace(`https://storage.googleapis.com/${bucketName}/`, "")
    .trim();

  await storage.bucket(bucketName).file(fileName).delete();
};
