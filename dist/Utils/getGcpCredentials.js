"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleCredentialsFile = getGoogleCredentialsFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let credentialsPathCache = null;
function getGoogleCredentialsFile() {
    if (credentialsPathCache) {
        return credentialsPathCache; // évite de réécrire
    }
    const base64Credentials = process.env.GCLOUD_CREDENTIALS_BASE64;
    if (!base64Credentials) {
        throw new Error("La variable GCLOUD_CREDENTIALS_BASE64 est absente.");
    }
    const decoded = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const credentialsPath = path_1.default.join(__dirname, "../tmp/gcloud-credentials.json");
    fs_1.default.mkdirSync(path_1.default.dirname(credentialsPath), { recursive: true });
    if (!fs_1.default.existsSync(credentialsPath)) {
        fs_1.default.writeFileSync(credentialsPath, decoded);
    }
    credentialsPathCache = credentialsPath;
    return credentialsPathCache;
}
