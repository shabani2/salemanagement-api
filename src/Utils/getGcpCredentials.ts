import fs from "fs";
import path from "path";

export function getGoogleCredentialsFile(): string {
  const base64Credentials = process.env.GCLOUD_CREDENTIALS_BASE64;

  if (!base64Credentials) {
    throw new Error("La variable GCLOUD_CREDENTIALS_BASE64 est absente.");
  }

  const decoded = Buffer.from(base64Credentials, "base64").toString("utf-8");

  const credentialsPath = path.join(
    __dirname,
    "../tmp/gcloud-credentials.json",
  );

  // Crée le dossier tmp s'il n'existe pas
  fs.mkdirSync(path.dirname(credentialsPath), { recursive: true });

  // Écrit les credentials dans un fichier temporaire
  fs.writeFileSync(credentialsPath, decoded);

  return credentialsPath;
}
