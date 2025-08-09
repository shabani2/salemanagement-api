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
const storage_1 = require("@google-cloud/storage");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const getGcpCredentials_1 = require("../Utils/getGcpCredentials");
// Création unique de l'instance Storage
let storage;
if (process.env.NODE_ENV === "production") {
  const keyFilename = (0, getGcpCredentials_1.getGoogleCredentialsFile)();
  storage = new storage_1.Storage({ keyFilename });
} else {
  storage = new storage_1.Storage();
}
const uploadFile = (file, directory) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.NODE_ENV !== "production") {
      const uploadDir = path_1.default.join(
        __dirname,
        `../../assets/${directory}`,
      );
      if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
      }
      if (!file.path) {
        throw new Error("Le fichier n'a pas de chemin local 'path'.");
      }
      const destinationPath = path_1.default.join(uploadDir, file.filename);
      fs_1.default.renameSync(file.path, destinationPath);
      return `assets/${directory}/${file.filename}`;
    }
    // Production - upload vers GCS
    const bucketName = process.env.GOOGLE_BUCKET_NAME;
    if (!bucketName) throw new Error("Bucket name non configuré");
    const bucket = storage.bucket(bucketName);
    const blob = bucket.file(`${directory}/${Date.now()}_${file.originalname}`);
    const blobStream = blob.createWriteStream();
    return new Promise((resolve, reject) => {
      blobStream.on("error", reject);
      blobStream.on("finish", () =>
        __awaiter(void 0, void 0, void 0, function* () {
          try {
            yield blob.makePublic();
            resolve(
              `https://storage.googleapis.com/${bucket.name}/${blob.name}`,
            );
          } catch (error) {
            reject(error);
          }
        }),
      );
      if (!file.buffer) {
        reject(new Error("Le fichier n'a pas de buffer à uploader."));
        return;
      }
      blobStream.end(file.buffer);
    });
  });
exports.uploadFile = uploadFile;
const deleteFile = (filePath) =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Mode développement: suppression locale
    if (process.env.NODE_ENV !== "production") {
      const fullPath = path_1.default.join(__dirname, `../../${filePath}`);
      if (fs_1.default.existsSync(fullPath)) {
        fs_1.default.unlinkSync(fullPath);
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
    yield storage.bucket(bucketName).file(fileName).delete();
  });
exports.deleteFile = deleteFile;
