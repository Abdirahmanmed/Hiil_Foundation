import crypto from "crypto";

export function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function addMinutes(date, minutes) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

export function isExpired(expiresAt) {
  return new Date(expiresAt).getTime() <= Date.now();
}
