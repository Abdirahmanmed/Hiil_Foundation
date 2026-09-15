import { Router } from "express";
import fs from "node:fs";

import { auth } from "../../middlewares/auth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { CAN_SUPERVISE } from "../../config/roles.js";
import * as kyc from "./kyc.service.js";

const router = Router();

// Les pieces d'identite ne concernent que la supervision : ni le depensier ni
// la tresorerie n'ont de raison de les ouvrir. Jamais servies en statique.
router.use(auth, requireRole(...CAN_SUPERVISE));

router.get("/:userId", async (req, res, next) => {
  try {
    res.json({ documents: await kyc.listKycDocuments({ userId: req.params.userId }) });
  } catch (err) {
    next(err);
  }
});

router.get("/:userId/:docType", async (req, res, next) => {
  try {
    const doc = await kyc.openKycDocument({
      actor: req.user,
      userId: req.params.userId,
      docType: req.params.docType,
      req,
    });

    res.setHeader("Content-Type", doc.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${doc.filename}"`);
    // Un document d'identite n'a rien a faire dans un cache partage.
    res.setHeader("Cache-Control", "private, no-store");

    fs.createReadStream(doc.absolutePath).pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;
