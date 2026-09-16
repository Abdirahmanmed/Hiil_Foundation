import * as service from "./expenses.service.js";
import {
  createExpenseSchema,
  expenseIdParamsSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
} from "./expenses.schemas.js";

export async function dashboard(req, res, next) {
  try {
    const stats = await service.getExpenseDashboard({ user: req.user });
    res.json({ stats });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const body = createExpenseSchema.parse(req.body);
    const expense = await service.createExpense({ user: req.user, data: body, req });
    res.status(201).json({ expense });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const expenses = await service.listExpenses({ user: req.user });
    res.json({ expenses });
  } catch (err) {
    next(err);
  }
}

export async function trail(req, res, next) {
  try {
    const params = expenseIdParamsSchema.parse(req.params);
    const result = await service.getExpenseTrail({ id: params.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function approve(req, res, next) {
  try {
    const params = expenseIdParamsSchema.parse(req.params);
    const body = approveExpenseSchema.parse(req.body);
    const result = await service.approveExpense({
      userId: req.user.id,
      id: params.id,
      password: body.password,
      req,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function reject(req, res, next) {
  try {
    const params = expenseIdParamsSchema.parse(req.params);
    const body = rejectExpenseSchema.parse(req.body);
    const result = await service.rejectExpense({
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
