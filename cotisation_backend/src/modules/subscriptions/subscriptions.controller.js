import * as subscriptionService from "./subscriptions.service.js";
import {
  createSubscriptionSchema,
  consentSchema,
} from "./subscriptions.schemas.js";

export const createSubscription = async (req, res, next) => {
  console.log("AUTH HEADER:", req.headers.authorization);
  console.log("REQ.USER:", req.user);
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
