import * as subscriptionService from "./subscriptions.service.js";
import {
  createSubscriptionSchema,
  consentSchema,
  updateSubscriptionSchema,
} from "./subscriptions.schemas.js";

export const createSubscription = async (req, res, next) => {
  try {
    const data = createSubscriptionSchema.parse(req.body);
    const userId = req.user.id;

    const sub = await subscriptionService.createSubscription(userId, data, req);
    res.status(201).json({ message: "Cotisation créée", subscription: sub });
  } catch (err) {
    next(err);
  }
};

export const listMySubscriptions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const subs = await subscriptionService.listMySubscriptions(userId);
    res.json({ subscriptions: subs });
  } catch (err) {
    next(err);
  }
};

export const getMySubscriptionById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const sub = await subscriptionService.getMySubscriptionById(userId, id);
    res.json({ subscription: sub });
  } catch (err) {
    next(err);
  }
};

export const acceptConsent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { accepted } = consentSchema.parse(req.body);

    const sub = await subscriptionService.acceptConsent(
      userId,
      id,
      accepted,
      req,
    );
    res.json({ message: "Consentement enregistré", subscription: sub });
  } catch (err) {
    next(err);
  }
};

export const updateSubscription = async (req, res, next) => {
  try {
    const body = updateSubscriptionSchema.parse(req.body);
    const updated = await subscriptionService.updateMySubscription(
      req.user.id,
      req.params.id,
      body,
      req,
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const result = await subscriptionService.cancelMySubscription(
      req.user.id,
      req.params.id,
      req,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};
