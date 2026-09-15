import * as service from "./paymentOrders.service.js";
import {
  createPaymentOrderSchema,
  paymentOrderIdParamsSchema,
  cancelPaymentOrderSchema,
  executePaymentOrderSchema,
} from "./paymentOrders.schemas.js";

export async function create(req, res, next) {
  try {
    const body = createPaymentOrderSchema.parse(req.body);
    const paymentOrder = await service.createPaymentOrder({ user: req.user, data: body, req });
    res.status(201).json({ paymentOrder });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const paymentOrders = await service.listPaymentOrders({ user: req.user });
    res.json({ paymentOrders });
  } catch (err) {
    next(err);
  }
}

export async function print(req, res, next) {
  try {
    const params = paymentOrderIdParamsSchema.parse(req.params);
    const paymentOrder = await service.getPaymentOrderPrint({ user: req.user, id: params.id, req });
    res.json({ paymentOrder });
  } catch (err) {
    next(err);
  }
}

export async function markPrinted(req, res, next) {
  try {
    const params = paymentOrderIdParamsSchema.parse(req.params);
    const paymentOrder = await service.markPaymentOrderPrinted({ user: req.user, id: params.id, req });
    res.json({ paymentOrder });
  } catch (err) {
    next(err);
  }
}

export async function cancel(req, res, next) {
  try {
    const params = paymentOrderIdParamsSchema.parse(req.params);
    const body = cancelPaymentOrderSchema.parse(req.body);
    const result = await service.cancelPaymentOrder({
      user: req.user,
      id: params.id,
      reason: body.reason,
      req,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function markExecuted(req, res, next) {
  try {
    const params = paymentOrderIdParamsSchema.parse(req.params);
    const body = executePaymentOrderSchema.parse(req.body || {});
    const result = await service.markPaymentOrderExecuted({
      user: req.user,
      id: params.id,
      executedAt: body.executedAt,
      req,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
