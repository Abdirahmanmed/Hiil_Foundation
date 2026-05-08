import { registerSchema, loginSchema } from "./auth.schemas.js";
import * as authService from "./auth.service.js";
import { sendEmailOtp } from "../otp/otp.service.js";

export async function register(req, res, next) {
  try {
    const accepted =
      req.body.acceptedConditions === true ||
      req.body.acceptedConditions === "true";

    const data = registerSchema.parse({
      accountType: req.body.accountType || "CLIENT_ADHERENT",

      fullName: req.body.fullName,
      companyName: req.body.companyName,
      phone: req.body.phone,
      phone2: req.body.phone2,

      email: req.body.email,
      country: req.body.country,
      city: req.body.city,
      commune: req.body.commune,

      password: req.body.password,
      acceptedConditions: accepted,
    });

    const user = await authService.createUser({
      data,
      files: req.files,
      req,
    });

    res.status(201).json({
      message: "Inscription OK. OTP en cours d’envoi par email.",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        accountType: user.accountType,
      },
    });

    sendEmailOtp({ email: user.email }).catch((e) => {
      console.error("OTP send failed:", e?.message || e);
    });
  } catch (err) {
    if (String(err?.code) === "P2002") {
      return res
        .status(409)
        .json({ message: "Téléphone ou email déjà utilisé." });
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    const result = await authService.loginUser({
      email: data.email,
      password: data.password,
      req,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getMe({ userId: req.user.sub });
    return res.json({ user });
  } catch (err) {
    next(err);
  }
}
