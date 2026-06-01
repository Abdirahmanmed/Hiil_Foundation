import * as adminService from "./admin.service.js";
import {
  createInternalUserSchema,
  setUserStatusSchema,
  setUserRoleSchema,
  resetUserOtpSchema,
  setSubscriptionStatusSchema,
  forceConsentSchema,
} from "./admin.schemas.js";

export async function dashboard(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats({ role: req.user.role });
    res.json({ stats });
  } catch (err) {
    next(err);
  }
}

export async function users(req, res, next) {
  try {
    const users = await adminService.listUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function subscriptions(req, res, next) {
  try {
    const subs = await adminService.listSubscriptions();
    res.json({ subscriptions: subs });
  } catch (err) {
    next(err);
  }
}

export async function adherentsContributions(req, res, next) {
  try {
    const contributions = await adminService.listAdherentsContributions();
    res.json({ contributions });
  } catch (err) {
    next(err);
  }
}

/* ===== ACTIONS USERS ===== */

export async function createInternalUser(req, res, next) {
  try {
    const body = createInternalUserSchema.parse(req.body);
    const created = await adminService.createInternalUser({
      adminId: req.user.id,
      adminRole: req.user.role,
      data: body,
      req,
    });
    res.status(201).json({ user: created });
  } catch (err) {
    next(err);
  }
}

export async function setUserStatus(req, res, next) {
  try {
    const body = setUserStatusSchema.parse(req.body);
    const updated = await adminService.setUserStatus({
      adminId: req.user.id,
      userId: req.params.userId,
      status: body.status,
      req,
    });
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}

export async function setUserRole(req, res, next) {
  try {
    const body = setUserRoleSchema.parse(req.body);
    const updated = await adminService.setUserRole({
      adminId: req.user.id,
      adminRole: req.user.role,
      userId: req.params.userId,
      role: body.role,
      req,
    });
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}

export async function resetUserOtp(req, res, next) {
  try {
    resetUserOtpSchema.parse(req.body || {});
    const updated = await adminService.resetUserOtpSecurity({
      adminId: req.user.id,
      userId: req.params.userId,
      req,
    });
    res.json({ otpSecurity: updated });
  } catch (err) {
    next(err);
  }
}

/* ===== ACTIONS SUBSCRIPTIONS ===== */

export async function setSubStatus(req, res, next) {
  try {
    const body = setSubscriptionStatusSchema.parse(req.body);
    const updated = await adminService.setSubscriptionStatus({
      adminId: req.user.id,
      subscriptionId: req.params.subscriptionId,
      status: body.status,
      req,
    });
    res.json({ subscription: updated });
  } catch (err) {
    next(err);
  }
}

export async function forceConsent(req, res, next) {
  try {
    const body = forceConsentSchema.parse(req.body || {});
    const updated = await adminService.forceSubscriptionConsent({
      adminId: req.user.id,
      subscriptionId: req.params.subscriptionId,
      consentVersion: body.consentVersion,
      req,
    });
    res.json({ subscription: updated });
  } catch (err) {
    next(err);
  }
}

export async function audit(req, res, next) {
  try {
    const result = await adminService.listAuditLogs({
      query: req.query,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function userDetails(req, res, next) {
  try {
    const user = await adminService.getUserDetails({
      userId: req.params.userId,
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
