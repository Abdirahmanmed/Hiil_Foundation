import * as service from "./treasury.service.js";

export async function dashboard(req, res, next) {
  try {
    const stats = await service.getTreasuryDashboard();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
}
