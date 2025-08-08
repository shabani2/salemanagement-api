import { Request } from "express";
import { File as MulterFile } from "multer";

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

export interface MulterRequest extends Request {
  file?: Express.MulterFile;
}
