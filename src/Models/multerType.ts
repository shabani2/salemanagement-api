import { Express } from 'express';


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