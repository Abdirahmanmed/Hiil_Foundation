import * as service from "./paymentOrders.service.js";
import { createPaymentOrderSchema, paymentOrderIdParamsSchema } from "./paymentOrders.schemas.js";

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
    const paymentOrders = await service.listPaymentOrders();
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
