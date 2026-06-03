import { env } from "../config/env.js";

const TOKEN_TTL_MS = 23 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function isMockMode() {
  return env.CAC_PAYMENT_MODE !== "live";
}

function requireLiveConfig() {
  const missing = [
    "CAC_BASE_URL",
    "CAC_USERNAME",
    "CAC_PASSWORD",
    "CAC_APP_KEY",
    "CAC_API_KEY",
    "CAC_COMPANY_SERVICE_ID",
  ].filter((key) => !env[key]);

  if (missing.length) {
    const err = new Error(`Configuration CAC incomplete: ${missing.join(", ")}`);
    err.status = 500;
    throw err;
  }
}

function buildUrl(path) {
  return `${env.CAC_BASE_URL.replace(/\/+$/, "")}${path}`;
}

async function postJson(path, body, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const err = new Error(data?.description || data?.message || "Erreur CAC Bank");
      err.status = response.status >= 500 ? 502 : response.status;
      err.cacResponse = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function credentialsBody() {
  return {
    app_key: env.CAC_APP_KEY,
    api_key: env.CAC_API_KEY,
  };
}

function mockPaymentRequestId() {
  return Math.floor(Date.now() / 1000);
}

export async function signin() {
  if (isMockMode()) {
    return {
      accessToken: "mock-cac-token",
      tokenType: "Bearer",
    };
  }

  requireLiveConfig();
  const data = await postJson("/paymentapi/auth/signin", {
    username: env.CAC_USERNAME,
    password: env.CAC_PASSWORD,
  });

  if (!data?.accessToken) {
    const err = new Error("CAC Bank n'a pas retourne de token");
    err.status = 502;
    throw err;
  }

  cachedToken = data.accessToken;
  cachedTokenExpiresAt = Date.now() + TOKEN_TTL_MS;

  return data;
}

export async function getValidToken() {
  if (isMockMode()) return "mock-cac-token";
  if (cachedToken && cachedTokenExpiresAt > Date.now()) return cachedToken;

  const auth = await signin();
  return auth.accessToken;
}

export async function initiatePayment({
  customerMobile,
  description,
  venderRef,
  amount,
}) {
  if (isMockMode()) {
    return {
      description: "Mock CAC: OTP envoye par SMS",
      paymentRequestId: mockPaymentRequestId(),
    };
  }

  const token = await getValidToken();
  return postJson(
    "/paymentapi/PaymentInitiateRequest",
    {
      ...credentialsBody(),
      customer_mobile: customerMobile,
      currency: env.CAC_CURRENCY,
      desc: description,
      vender_ref: venderRef,
      amount,
      company_services_id: env.CAC_COMPANY_SERVICE_ID,
    },
    token,
  );
}

export async function confirmPayment({ paymentRequestId, otp }) {
  if (isMockMode()) {
    if (otp !== "123456") {
      const err = new Error("OTP invalide");
      err.status = 400;
      throw err;
    }

    return {
      description: "Mock CAC: paiement confirme",
      confirmReference: paymentRequestId,
      reference: `MOCK-CAC-${paymentRequestId}`,
    };
  }

  const token = await getValidToken();
  return postJson(
    "/paymentapi/PaymentConfirmationRequest",
    {
      ...credentialsBody(),
      payment_request_id: Number(paymentRequestId),
      otp,
    },
    token,
  );
}

export async function getPaymentByReference(reference) {
  if (isMockMode()) {
    return {
      description: "Mock CAC: paiement trouve",
      reference,
      status: "CONFIRMED",
    };
  }

  const token = await getValidToken();
  return postJson(
    "/paymentapi/GetPaymentByReferenceRequest",
    {
      ...credentialsBody(),
      reference,
    },
    token,
  );
}

export async function getPaymentByDate({ fromDate, toDate }) {
  if (isMockMode()) {
    return {
      description: "Mock CAC: paiements par date",
      payments: [],
      from_date: fromDate,
      to_date: toDate,
    };
  }

  const token = await getValidToken();
  return postJson(
    "/paymentapi/GetPaymentByDateRequest",
    {
      ...credentialsBody(),
      companyServiceId: env.CAC_COMPANY_SERVICE_ID,
      from_date: fromDate,
      to_date: toDate,
    },
    token,
  );
}
