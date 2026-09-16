import * as service from "./bootstrap.service.js";
import {
  createOugasAdminSchema,
  ougasAdminIdParamsSchema,
} from "./bootstrap.schemas.js";

export async function listOugas(req, res, next) {
  try {
    const ougasAdmins = await service.listOugasAdmins();
    res.json({ ougasAdmins });
  } catch (err) {
    next(err);
  }
}

export async function createOugas(req, res, next) {
  try {
    const body = createOugasAdminSchema.parse(req.body);
    const created = await service.createOugasAdmin({
      actorId: req.user.id,
      data: body,
      req,
    });
    res.status(201).json({ ougasAdmin: created });
  } catch (err) {
    next(err);
  }
}

export async function resendOugasInvite(req, res, next) {
  try {
    const params = ougasAdminIdParamsSchema.parse(req.params);
    const result = await service.resendOugasInvitation({
      actorId: req.user.id,
      userId: params.userId,
      req,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
