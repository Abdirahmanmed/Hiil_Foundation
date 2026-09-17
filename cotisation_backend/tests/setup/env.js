import "dotenv/config";

/**
 * Les valeurs minimales pour que src/config/env.js se charge.
 *
 * Trois fichiers de tests — app, roles, storage — importaient du code qui
 * remonte jusqu'a env.js, lequel exige DATABASE_URL, les secrets JWT, le poivre
 * OTP et la configuration SMTP au chargement. Sur un poste de developpement le
 * .env local les fournissait, et la suite passait. En CI, ou aucun .env
 * n'existe, les trois fichiers echouaient a l'import.
 *
 * Autrement dit, « 79 tests au vert » mesurait la machine, pas le code. Ces
 * valeurs rendent la mesure independante du poste.
 *
 * `dotenv/config` est importe EN PREMIER, et chaque defaut n'est pose que si la
 * variable manque encore : un .env reel l'emporte donc toujours, et le
 * DATABASE_URL que tests/setup/guard.js derive de TEST_DATABASE_URL aussi.
 */
const DEFAUTS = {
  DATABASE_URL: "postgresql://test:test@localhost:5432/cotisation_test",
  JWT_ACCESS_SECRET: "test-access-secret-test-access-secret-test-acce",
  JWT_REFRESH_SECRET: "test-refresh-secret-test-refresh-secret-test-re",
  OTP_PEPPER: "test-otp-pepper-test-otp-pepper-t",
  CAC_PAYMENT_MODE: "mock",
  // Sans BREVO_API_KEY, env.js exige le trio SMTP. Aucun mail ne part : les
  // tests ne touchent pas au transport.
  EMAIL_HOST: "localhost",
  EMAIL_USER: "test",
  EMAIL_PASS: "test",
  EMAIL_FROM: "no-reply@test.invalid",
};

for (const [cle, valeur] of Object.entries(DEFAUTS)) {
  if (!process.env[cle]) process.env[cle] = valeur;
}
