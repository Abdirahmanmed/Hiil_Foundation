export function generateOtpCode() {
  // 6 digits
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function addMinutes(date, minutes) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

export function isExpired(expiresAt) {
  return new Date(expiresAt).getTime() <= Date.now();
}
