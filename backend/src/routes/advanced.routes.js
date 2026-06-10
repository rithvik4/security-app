import { Router } from "express";

import {
  acknowledgeEmergencyAlert,
  createAnnouncement,
  createComplaint,
  createDelivery,
  createEmergencyAlert,
  createMaintenanceInvoice,
  getAnalyticsOverview,
  getGuardDashboard,
  getResidentDirectory,
  listAnnouncements,
  listAuditLogs,
  listComplaints,
  listDeliveries,
  listEmergencyAlerts,
  listMaintenanceInvoices,
  listVehicles,
  recordMaintenancePayment,
  registerVehicle,
  updateComplaintStatus,
  updateDeliveryStatus,
  updateVehicleStatus,
  verifyResidentIdentity,
} from "../controllers/advanced.controller.js";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { ApiError } from "../utils/apiError.js";
import {
  acknowledgeEmergencyAlertSchema,
  createAnnouncementSchema,
  createComplaintSchema,
  createDeliverySchema,
  createEmergencyAlertSchema,
  createMaintenanceInvoiceSchema,
  listAuditLogsSchema,
  listComplaintsSchema,
  listDeliveriesSchema,
  listEmergencyAlertsSchema,
  listMaintenanceInvoicesSchema,
  listVehiclesSchema,
  recordMaintenancePaymentSchema,
  registerVehicleSchema,
  residentDirectorySchema,
  updateComplaintStatusSchema,
  updateDeliveryStatusSchema,
  updateVehicleStatusSchema,
  verifyResidentSchema,
} from "../validations/advanced.validation.js";

const router = Router();

router.use(authenticate);
router.use((_req, _res, next) => {
  // Advanced modules require regenerated Prisma client delegates.
  if (!prisma.delivery || !prisma.auditLog || !prisma.vehicle) {
    return next(
      new ApiError(
        503,
        "Advanced modules are not ready. Run Prisma migrate/generate and restart backend."
      )
    );
  }

  return next();
});

router.get("/residents", authorize("ADMIN", "SECURITY"), validate(residentDirectorySchema), getResidentDirectory);
router.post(
  "/residents/verify",
  authorize("ADMIN", "SECURITY"),
  validate(verifyResidentSchema),
  verifyResidentIdentity
);

router.post("/deliveries", authorize("ADMIN", "SECURITY"), validate(createDeliverySchema), createDelivery);
router.get("/deliveries", authorize("ADMIN", "SECURITY", "MEMBER"), validate(listDeliveriesSchema), listDeliveries);
router.patch(
  "/deliveries/:id/status",
  authorize("ADMIN", "SECURITY", "MEMBER"),
  validate(updateDeliveryStatusSchema),
  updateDeliveryStatus
);

router.post("/vehicles", authorize("MEMBER"), validate(registerVehicleSchema), registerVehicle);
router.get("/vehicles", authorize("ADMIN", "SECURITY", "MEMBER"), validate(listVehiclesSchema), listVehicles);
router.patch(
  "/vehicles/:id/status",
  authorize("ADMIN", "SECURITY"),
  validate(updateVehicleStatusSchema),
  updateVehicleStatus
);

router.post(
  "/emergency-alerts",
  authorize("ADMIN", "SECURITY", "MEMBER"),
  validate(createEmergencyAlertSchema),
  createEmergencyAlert
);
router.get(
  "/emergency-alerts",
  authorize("ADMIN", "SECURITY", "MEMBER"),
  validate(listEmergencyAlertsSchema),
  listEmergencyAlerts
);
router.patch(
  "/emergency-alerts/:id/acknowledge",
  authorize("ADMIN", "SECURITY"),
  validate(acknowledgeEmergencyAlertSchema),
  acknowledgeEmergencyAlert
);

router.post(
  "/maintenance-invoices",
  authorize("ADMIN"),
  validate(createMaintenanceInvoiceSchema),
  createMaintenanceInvoice
);
router.get(
  "/maintenance-invoices",
  authorize("ADMIN", "MEMBER"),
  validate(listMaintenanceInvoicesSchema),
  listMaintenanceInvoices
);
router.post(
  "/maintenance-invoices/:id/payments",
  authorize("ADMIN", "MEMBER"),
  validate(recordMaintenancePaymentSchema),
  recordMaintenancePayment
);

router.post("/complaints", authorize("ADMIN", "MEMBER"), validate(createComplaintSchema), createComplaint);
router.get("/complaints", authorize("ADMIN", "SECURITY", "MEMBER"), validate(listComplaintsSchema), listComplaints);
router.patch(
  "/complaints/:id/status",
  authorize("ADMIN", "SECURITY"),
  validate(updateComplaintStatusSchema),
  updateComplaintStatus
);

router.post("/announcements", authorize("ADMIN"), validate(createAnnouncementSchema), createAnnouncement);
router.get("/announcements", authorize("ADMIN", "SECURITY", "MEMBER"), listAnnouncements);

router.get("/security/dashboard", authorize("SECURITY"), getGuardDashboard);
router.get("/analytics/overview", authorize("ADMIN"), getAnalyticsOverview);
router.get("/audit-logs", authorize("ADMIN"), validate(listAuditLogsSchema), listAuditLogs);

export default router;
