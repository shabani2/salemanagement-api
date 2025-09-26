// file: src/scripts/email-smoke.ts
// Utilise Resend SMTP direct pour valider ta conf réseau/env.
// npx tsx src/scripts/email-smoke.ts
import "dotenv/config";
import { sendEmail } from "../Utils/emailService";

(async () => {
  try {
    console.log("SMOKE → envoi via Resend SMTP…");
    await sendEmail(
      "delivered@resend.dev", // boîte “ok” de test Resend
      "SMTP Smoke Test",
      "<strong>It works!</strong> via Resend SMTP",
    );
    console.log("✅ Smoke OK. Si ça n’apparaît pas dans Resend, la conf/env est KO.");
  } catch (e: any) {
    console.error("❌ Smoke failed:", e?.message || e);
    process.exit(1);
  }
})();
