import { Router } from "express";

import { decideVisitor, myVisitors } from "../controllers/member.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { decisionSchema } from "../validations/member.validation.js";

const router = Router();

router.use(authenticate, authorize("MEMBER"));

router.get("/visitors", myVisitors);
router.patch("/visitors/:logId/decision", validate(decisionSchema), decideVisitor);

export default router;
