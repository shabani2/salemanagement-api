import multer from "multer";
import path from "path";
import fs from "fs";

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("BODY reçu par multer:", req.body);
    const role = req.body.role || "default"; // req.body.role est maintenant disponible
    const uploadDir = path.join(__dirname, `../../assets/${role}`);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
//const storage = multer.memoryStorage();
export const upload = multer({ storage });
