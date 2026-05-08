import { app } from "./app.js";
import { env } from "./config/env.js";
import { verifyMailer } from "./services/mail.service.js";

verifyMailer();

app.listen(env.PORT, () => {
  console.log(`✅ API running on http://localhost:${env.PORT}`);
});
