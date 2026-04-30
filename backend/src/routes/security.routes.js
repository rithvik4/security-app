import { Router } from "express";

import {
  createVisitorEntry,
  listFlatsForSecurity,
  listActiveEntries,
  markVisitorExit,
} from "../controllers/security.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createVisitorEntrySchema,
  markExitSchema,
} from "../validations/security.validation.js";

const router = Router();

router.use(authenticate, authorize("SECURITY"));

router.get("/flats", listFlatsForSecurity);
router.post("/visitor-entry", validate(createVisitorEntrySchema), createVisitorEntry);
router.get("/active-entries", listActiveEntries);
router.patch("/visitor-exit/:logId", validate(markExitSchema), markVisitorExit);

export default router;
