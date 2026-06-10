import { Router } from "express";

import {
  addFrequentVisitor,
  listFrequentVisitors,
  listStaffAttendance,
  listVisitorInvites,
  staffCheckIn,
  staffCheckOut,
  createVisitorInvite,
  updateFrequentVisitor,
  verifyInviteOtp,
} from "../controllers/staff.controller.js";
import {
  createAmenity,
  createBooking,
  listAmenities,
  listBookings,
  updateAmenity,
  updateBookingStatus,
} from "../controllers/amenity.controller.js";
import {
  allocateParkingSlot,
  closePoll,
  createParkingSlot,
  createPoll,
  getPollResults,
  listParkingAllocations,
  listParkingSlots,
  listPolls,
  releaseParkingSlot,
  voteOnPoll,
} from "../controllers/community.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  addFrequentVisitorSchema,
  allocateParkingSchema,
  createAmenitySchema,
  createBookingSchema,
  createInviteSchema,
  createParkingSlotSchema,
  createPollSchema,
  listAllocationsSchema,
  listAttendanceSchema,
  listBookingsSchema,
  listFrequentVisitorsSchema,
  listParkingSlotsSchema,
  staffCheckInSchema,
  updateAmenitySchema,
  updateBookingStatusSchema,
  updateFrequentVisitorSchema,
  verifyOtpSchema,
  voteSchema,
} from "../validations/modules.validation.js";
import { ApiError } from "../utils/apiError.js";
import { prisma } from "../config/prisma.js";

const router = Router();

router.use(authenticate);

// Readiness guard for new module delegates
router.use((_req, _res, next) => {
  if (!prisma.frequentVisitor || !prisma.parkingSlot || !prisma.societyPoll || !prisma.amenity) {
    return next(new ApiError(503, "New modules not ready. Run prisma migrate/generate and restart backend."));
  }
  return next();
});

// ─── Frequent Visitors + Attendance ──────────────────────────────────────────
router.post("/staff", authorize("MEMBER"), validate(addFrequentVisitorSchema), addFrequentVisitor);
router.get("/staff", authorize("ADMIN", "SECURITY", "MEMBER"), validate(listFrequentVisitorsSchema), listFrequentVisitors);
router.patch("/staff/:id", authorize("ADMIN", "MEMBER"), validate(updateFrequentVisitorSchema), updateFrequentVisitor);

router.post("/staff/checkin", authorize("ADMIN", "SECURITY"), validate(staffCheckInSchema), staffCheckIn);
router.post("/staff/checkout", authorize("ADMIN", "SECURITY"), validate(staffCheckInSchema), staffCheckOut);
router.get("/staff/attendance", authorize("ADMIN", "SECURITY", "MEMBER"), validate(listAttendanceSchema), listStaffAttendance);

// ─── Visitor OTP Invites ──────────────────────────────────────────────────────
router.post("/invites", authorize("MEMBER"), validate(createInviteSchema), createVisitorInvite);
router.get("/invites", authorize("ADMIN", "SECURITY", "MEMBER"), listVisitorInvites);
router.post("/invites/verify", authorize("ADMIN", "SECURITY"), validate(verifyOtpSchema), verifyInviteOtp);

// ─── Amenities ────────────────────────────────────────────────────────────────
router.post("/amenities", authorize("ADMIN"), validate(createAmenitySchema), createAmenity);
router.get("/amenities", authorize("ADMIN", "SECURITY", "MEMBER"), listAmenities);
router.patch("/amenities/:id", authorize("ADMIN"), validate(updateAmenitySchema), updateAmenity);

router.post("/amenity-bookings", authorize("MEMBER"), validate(createBookingSchema), createBooking);
router.get("/amenity-bookings", authorize("ADMIN", "SECURITY", "MEMBER"), validate(listBookingsSchema), listBookings);
router.patch("/amenity-bookings/:id/status", authorize("ADMIN", "MEMBER"), validate(updateBookingStatusSchema), updateBookingStatus);

// ─── Polls ────────────────────────────────────────────────────────────────────
router.post("/polls", authorize("ADMIN"), validate(createPollSchema), createPoll);
router.get("/polls", authorize("ADMIN", "SECURITY", "MEMBER"), listPolls);
router.get("/polls/:id/results", authorize("ADMIN", "SECURITY", "MEMBER"), getPollResults);
router.post("/polls/:id/vote", authorize("ADMIN", "SECURITY", "MEMBER"), validate(voteSchema), voteOnPoll);
router.patch("/polls/:id/close", authorize("ADMIN"), closePoll);

// ─── Parking ──────────────────────────────────────────────────────────────────
router.post("/parking/slots", authorize("ADMIN"), validate(createParkingSlotSchema), createParkingSlot);
router.get("/parking/slots", authorize("ADMIN", "SECURITY", "MEMBER"), validate(listParkingSlotsSchema), listParkingSlots);
router.post("/parking/slots/:id/allocate", authorize("ADMIN", "SECURITY"), validate(allocateParkingSchema), allocateParkingSlot);
router.post("/parking/slots/:id/release", authorize("ADMIN", "SECURITY"), releaseParkingSlot);
router.get("/parking/allocations", authorize("ADMIN", "SECURITY"), validate(listAllocationsSchema), listParkingAllocations);

export default router;
