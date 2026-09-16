import { publicSubmissionSchema } from "./publicForms.schemas.js";
import * as publicFormsService from "./publicForms.service.js";

export async function submit(req, res, next) {
  try {
    const data = publicSubmissionSchema.parse(req.body);

    // Champ piege rempli : on repond comme si tout allait bien, sans rien
    // ecrire. Un robot n'apprend pas qu'il a ete detecte.
    if (data.website) {
      return res.status(201).json({ message: "Candidature reçue." });
    }

    const submission = await publicFormsService.recordPublicSubmission({
      data,
      req,
    });

    res.status(201).json({
      message: "Candidature reçue.",
      submissionId: submission.id,
    });
  } catch (err) {
    next(err);
  }
}
