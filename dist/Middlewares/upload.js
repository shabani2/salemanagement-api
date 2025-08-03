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
// const storage = multer.diskStorage({
//   destination: (req: { body: { role: string; }; }, file: any, cb: (arg0: null, arg1: string) => void) => {
//     const role = req.body.role || 'default';
//     const uploadDir = path.join(__dirname, `../../assets/${role}`);
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//     cb(null, uploadDir);
//   },
//   filename: (req: any, file: { originalname: string; }, cb: (arg0: null, arg1: string) => void) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });
const storage = multer_1.default.diskStorage({
  destination: (req, file, cb) => {
    console.log("BODY reçu par multer:", req.body);
    const role = req.body.role || "default"; // req.body.role est maintenant disponible
    const uploadDir = path_1.default.join(__dirname, `../../assets/${role}`);
    if (!fs_1.default.existsSync(uploadDir)) {
      fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path_1.default.extname(file.originalname));
  },
});
//const storage = multer.memoryStorage();
exports.upload = (0, multer_1.default)({ storage });
