"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let storage;
if (process.env.NODE_ENV === "production") {
  // En prod : stockage en mémoire pour envoyer vers GCS
  storage = multer_1.default.memoryStorage();
} else {
  // En local : stockage sur disque avec dossier par rôle
  storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
      const role = req.body.role || "default";
      const uploadDir = path_1.default.join(__dirname, `/assets/${role}`);
      if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path_1.default.extname(file.originalname));
    },
  });
}
exports.upload = (0, multer_1.default)({ storage });
