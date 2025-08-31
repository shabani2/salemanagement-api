"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.uploadFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const storage_1 = require("@google-cloud/storage");
const getGcpCredentials_1 = require("../Utils/getGcpCredentials");
// Instance unique de GCS
let storage;
if (process.env.NODE_ENV === "production" && process.env.GOOGLE_BUCKET_NAME) {
  try {
    const keyFilename = (0, getGcpCredentials_1.getGoogleCredentialsFile)();
    storage = new storage_1.Storage({ keyFilename });
  } catch (err) {
    console.warn("⚠ Google Cloud Storage désactivé : credentials manquants.");
  }
}
const uploadFile = (file, directory) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      // 📦 Sauvegarde locale (Heroku inclus)
      const uploadDir = path_1.default.join(
        __dirname,
        `../../assets/${directory}`,
      );
      if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
      }
      // Cas 1 : multer.diskStorage → file.path existe
      if (file.path) {
        const destinationPath = path_1.default.join(uploadDir, file.filename);
        fs_1.default.renameSync(file.path, destinationPath);
        return `assets/${directory}/${file.filename}`;
      }
      // Cas 2 : multer.memoryStorage → file.buffer existe
      if (file.buffer) {
        const destinationPath = path_1.default.join(
          uploadDir,
          file.originalname,
        );
        fs_1.default.writeFileSync(destinationPath, file.buffer);
        return `assets/${directory}/${file.originalname}`;
      }
      throw new Error("Le fichier n'a ni buffer ni chemin local.");
    } catch (err) {
      console.error("Erreur uploadFile:", err);
      throw err;
    }
  });
exports.uploadFile = uploadFile;
/**
 * Suppression d'un fichier en local ou sur GCS
 */
const deleteFile = (filePath) =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      // 1️⃣ Suppression locale (Heroku inclus)
      const localPath = path_1.default.join(__dirname, `../../${filePath}`);
      if (fs_1.default.existsSync(localPath)) {
        fs_1.default.unlinkSync(localPath);
        return;
      }
      // 2️⃣ Suppression sur Google Cloud Storage si configuré
      if (storage && process.env.GOOGLE_BUCKET_NAME) {
        const bucketName = process.env.GOOGLE_BUCKET_NAME;
        const fileName = filePath.replace(
          `https://storage.googleapis.com/${bucketName}/`,
          "",
        );
        yield storage.bucket(bucketName).file(fileName).delete();
      }
    } catch (err) {
      console.error("Erreur lors de la suppression du fichier:", err);
    }
  });
exports.deleteFile = deleteFile;
