import { Router } from "express";

import adminRoutes from "./admin.routes.js";
import authRoutes from "./auth.routes.js";
import memberRoutes from "./member.routes.js";
import securityRoutes from "./security.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/security", securityRoutes);
router.use("/member", memberRoutes);

export default router;
