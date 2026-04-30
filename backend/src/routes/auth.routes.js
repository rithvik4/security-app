import { Router } from "express";

import { login, logout, me, refresh } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { loginSchema, logoutSchema, refreshSchema } from "../validations/auth.validation.js";

const router = Router();

router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", validate(logoutSchema), logout);
router.get("/me", authenticate, me);

export default router;
