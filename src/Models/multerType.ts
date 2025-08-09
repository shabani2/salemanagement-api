import { Request } from "express";

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename: string;
  path?: string;
  buffer?: Buffer;
}

export interface MulterRequest extends Request {
  // Remplacer 'file' par un autre nom pour éviter le conflit, ou rendre 'file' optionnel sans héritage direct
  multerFile?: MulterFile;
  multerFiles?: MulterFile[];
}
