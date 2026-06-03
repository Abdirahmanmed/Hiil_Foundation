import * as cacPaymentsService from "./cacPayments.service.js";

export const initiateSubscriptionPayment = async (req, res, next) => {
  try {
    const result = await cacPaymentsService.initiateSubscriptionPayment(
      req.user.id,
      req.params.subscriptionId,
      req,
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const confirmSubscriptionPayment = async (req, res, next) => {
  try {
    const result = await cacPaymentsService.confirmSubscriptionPayment(
      req.user.id,
      req.params.subscriptionId,
      req.body.otp,
      req,
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getSubscriptionPaymentStatus = async (req, res, next) => {
  try {
    const payment = await cacPaymentsService.getSubscriptionPaymentStatus(
      req.user.id,
      req.params.subscriptionId,
    );

    res.json({ payment });
  } catch (err) {
    next(err);
  }
};
