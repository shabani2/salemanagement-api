import fs from "fs";
import path from "path";

let credentialsPathCache: string | null = null;

export function getGoogleCredentialsFile(): string {
  if (credentialsPathCache) {
    return credentialsPathCache; // évite de réécrire
  }

  const base64Credentials = process.env.GCLOUD_CREDENTIALS_BASE64;
  if (!base64Credentials) {
    throw new Error("La variable GCLOUD_CREDENTIALS_BASE64 est absente.");
  }

  const decoded = Buffer.from(base64Credentials, "base64").toString("utf-8");

  const credentialsPath = path.join(
    __dirname,
    "../tmp/gcloud-credentials.json"
  );

  fs.mkdirSync(path.dirname(credentialsPath), { recursive: true });

  if (!fs.existsSync(credentialsPath)) {
    fs.writeFileSync(credentialsPath, decoded);
  }

  credentialsPathCache = credentialsPath;
  return credentialsPathCache;
}
