import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import {MulterFile} from '../Models/multerType'

// Configuration GCS
const storage = new Storage({
  keyFilename: path.join(__dirname, '../googleCloudConfig/agricaptest-fa42ab744cc7.json'),
});
const bucket = storage.bucket(process.env.GOOGLE_BUCKET_NAME || '');

export const uploadFile = async (file: MulterFile, directory: string): Promise<string> => {
  // Mode développement: sauvegarde locale
  if (process.env.NODE_ENV === 'development') {
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
  if (!bucketName) throw new Error('Bucket name non configuré');

  const storage = new Storage({
    keyFilename: path.join(__dirname, '../../chemin/vers/service-account.json'),
  });
  
  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(`${directory}/${Date.now()}_${file.originalname}`);
  const blobStream = blob.createWriteStream();

  return new Promise((resolve, reject) => {
    blobStream.on('error', (error) => reject(error));
    
    blobStream.on('finish', async () => {
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