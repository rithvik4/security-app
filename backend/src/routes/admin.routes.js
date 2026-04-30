import { Router } from "express";

import {
  createFlat,
  createFlatWithMembers,
  createMember,
  createSecurity,
  deleteFlat,
  deleteMember,
  deleteSecurity,
  getDashboardSummary,
  listFlats,
  listMembers,
  listSecurity,
  listVisitorLogs,
  updateFlat,
  updateMember,
  updateSecurity,
} from "../controllers/admin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createFlatSchema,
  createFlatWithMembersSchema,
  createMemberSchema,
  createSecuritySchema,
  logFilterSchema,
  updateFlatSchema,
  updateMemberSchema,
  updateSecuritySchema,
  userIdParamSchema,
} from "../validations/admin.validation.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.get("/dashboard/summary", getDashboardSummary);

router.post("/flats", validate(createFlatSchema), createFlat);
router.post("/flats-with-members", validate(createFlatWithMembersSchema), createFlatWithMembers);
router.get("/flats", listFlats);
router.patch("/flats/:id", validate(updateFlatSchema), updateFlat);
router.delete("/flats/:id", validate(userIdParamSchema), deleteFlat);

router.post("/members", validate(createMemberSchema), createMember);
router.get("/members", listMembers);
router.patch("/members/:id", validate(updateMemberSchema), updateMember);
router.delete("/members/:id", validate(userIdParamSchema), deleteMember);

router.post("/security", validate(createSecuritySchema), createSecurity);
router.get("/security", listSecurity);
router.patch("/security/:id", validate(updateSecuritySchema), updateSecurity);
router.delete("/security/:id", validate(userIdParamSchema), deleteSecurity);

router.get("/visitor-logs", validate(logFilterSchema), listVisitorLogs);

export default router;
