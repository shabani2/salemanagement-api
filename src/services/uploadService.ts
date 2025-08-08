import { Storage } from "@google-cloud/storage";
import path from "path";
import fs from "fs";
import { MulterFile } from "../Models/multerType";
import multer from "multer";

// Configuration GCS
export const storage = new Storage({
  keyFilename: path.join(
    __dirname,
    "../googleCloudConfig/agricaptest-fa42ab744cc7.json",
  ),
});
const bucket = storage.bucket(process.env.GOOGLE_BUCKET_NAME || "");

export const uploadFile = async (
  file: MulterFile,
  directory: string,
): Promise<string> => {
  // Mode développement: sauvegarde locale
  if (process.env.NODE_ENV === "development") {
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

  const storage = new Storage({
    keyFilename: path.join(__dirname, "../../chemin/vers/service-account.json"),
  });

  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(`${directory}/${Date.now()}_${file.originalname}`);
  const blobStream = blob.createWriteStream();

  return new Promise((resolve, reject) => {
    blobStream.on("error", (error) => reject(error));

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

export const deleteFile = async (filePath: string) => {
  // En développement: suppression locale
  if (process.env.NODE_ENV === "development") {
    const fullPath = path.join(__dirname, `../../${filePath}`);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return;
  }

  // En production: suppression GCS
  const bucketName = process.env.GOOGLE_BUCKET_NAME;
  if (!bucketName) throw new Error("Bucket name non configuré");

  const storage = new Storage({
    keyFilename: path.join(__dirname, "../../chemin/service-account.json"),
  });

  // Extraire le nom du fichier depuis l'URL
  const fileName =
    filePath
      .split("https://storage.googleapis.com/")[1]
      ?.split("/")
      .slice(1)
      .join("/") || filePath;

  await storage.bucket(bucketName).file(fileName).delete();
};

// export const storage = multer.memoryStorage(); // Utilisez memoryStorage pour GCS
// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024 // 5MB
//   }
// });
