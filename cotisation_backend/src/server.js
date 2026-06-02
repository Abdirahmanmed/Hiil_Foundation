import { app } from "./app.js";
import { env } from "./config/env.js";
import { verifyMailer } from "./services/mail.service.js";
import { performance } from "node:perf_hooks";

const bootStart = performance.now();

app.listen(env.PORT, () => {
  const bootMs = Math.round((performance.now() - bootStart) * 10) / 10;
  console.log(`✅ API running on http://localhost:${env.PORT} (boot ${bootMs}ms)`);

  // Ne bloque pas le démarrage ni les requêtes login avec la vérification SMTP.
  setImmediate(() => {
    verifyMailer();
  });
});
