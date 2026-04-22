// tests/conflictDetection.test.js
//
// Unit tests for your conflict detection logic.
// These tests are based on your ACTUAL schema fields:
//   departureTime / arrivalTime — stored as "HH:MM" strings (Schedule.js)
//   restUntil                   — Date field on Driver document (Driver.js)
//   dutyType                    — "linked" | "unlinked" (Schedule.js)
//   status                      — "scheduled" | "active" | "completed" | "cancelled"
//
// Run with: npm test  (Jest must be installed — npm install --save-dev jest)
// Zero database, zero server, zero HTTP — pure logic only.

const {
  toMinutes,
  hasTimeOverlap,
  isDriverOnRest,
  checkBusConflict,
  checkDriverConflict,
  checkLinkedDutyConflict,
} = require("../utils/conflictDetection");

// ─────────────────────────────────────────────────────────────
// HELPER — reusable fake IDs (strings, like .toString() on ObjectId)
// ─────────────────────────────────────────────────────────────
const BUS_101   = "64f3a2b1c8d9e4f012345601";
const BUS_202   = "64f3a2b1c8d9e4f012345602";
const DRIVER_A  = "64f3a2b1c8d9e4f012345701";
const DRIVER_B  = "64f3a2b1c8d9e4f012345702";
const ROUTE_001 = "64f3a2b1c8d9e4f012345801";

// ─────────────────────────────────────────────────────────────
// 1. toMinutes() — time string conversion
// ─────────────────────────────────────────────────────────────
describe("toMinutes()", () => {

  test("converts midnight correctly", () => {
    expect(toMinutes("00:00")).toBe(0);
  });

  test("converts 08:00 to 480", () => {
    expect(toMinutes("08:00")).toBe(480);
  });

  test("converts 12:30 to 750", () => {
    expect(toMinutes("12:30")).toBe(750);
  });

  test("converts 23:59 to 1439", () => {
    expect(toMinutes("23:59")).toBe(1439);
  });

});

// ─────────────────────────────────────────────────────────────
// 2. hasTimeOverlap() — the core interval formula
// ─────────────────────────────────────────────────────────────
describe("hasTimeOverlap()", () => {

  test("returns true — new schedule starts inside existing window", () => {
    // Existing: 08:00–12:00,  Incoming: 10:00–14:00
    expect(hasTimeOverlap("10:00", "14:00", "08:00", "12:00")).toBe(true);
  });

  test("returns true — new schedule ends inside existing window", () => {
    // Existing: 10:00–16:00,  Incoming: 08:00–11:00
    expect(hasTimeOverlap("08:00", "11:00", "10:00", "16:00")).toBe(true);
  });

  test("returns true — new schedule completely wraps existing", () => {
    // Existing: 09:00–11:00,  Incoming: 08:00–14:00
    expect(hasTimeOverlap("08:00", "14:00", "09:00", "11:00")).toBe(true);
  });

  test("returns true — new schedule is completely inside existing", () => {
    // Existing: 08:00–16:00,  Incoming: 10:00–12:00
    expect(hasTimeOverlap("10:00", "12:00", "08:00", "16:00")).toBe(true);
  });

  test("returns true — identical time windows", () => {
    expect(hasTimeOverlap("08:00", "12:00", "08:00", "12:00")).toBe(true);
  });

  test("returns false — new schedule ends exactly when existing starts (boundary touch)", () => {
    // This is the case your original code MISSED — 08:00-12:00 then 12:00-16:00 is NOT a conflict
    expect(hasTimeOverlap("08:00", "12:00", "12:00", "16:00")).toBe(false);
  });

  test("returns false — new schedule starts exactly when existing ends (boundary touch)", () => {
    expect(hasTimeOverlap("12:00", "16:00", "08:00", "12:00")).toBe(false);
  });

  test("returns false — schedules are completely separate with a gap", () => {
    // Existing: 08:00–10:00,  Incoming: 14:00–18:00
    expect(hasTimeOverlap("14:00", "18:00", "08:00", "10:00")).toBe(false);
  });

  test("returns true — one minute overlap is still a conflict", () => {
    // Existing: 08:00–12:01,  Incoming: 12:00–14:00 — 1 minute overlap
    expect(hasTimeOverlap("12:00", "14:00", "08:00", "12:01")).toBe(true);
  });

  // THE BUG THIS FIXES — your original code only checked exact departureTime match
  test("returns true — different departure times but windows overlap (bug your original code missed)", () => {
    // Bus departs at 08:00, arrives 14:00.
    // New schedule departs at 10:00 (different exact time) — original findOne({ departureTime }) would miss this
    expect(hasTimeOverlap("10:00", "16:00", "08:00", "14:00")).toBe(true);
  });

});

// ─────────────────────────────────────────────────────────────
// 3. isDriverOnRest() — checks driver.restUntil field
// ─────────────────────────────────────────────────────────────
describe("isDriverOnRest()", () => {

  test("returns false when restUntil is null (driver has no rest period)", () => {
    expect(isDriverOnRest(null)).toBe(false);
  });

  test("returns false when restUntil is undefined", () => {
    expect(isDriverOnRest(undefined)).toBe(false);
  });

  test("returns true when current time is before restUntil", () => {
    const restUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const now       = new Date();
    expect(isDriverOnRest(restUntil, now)).toBe(true);
  });

  test("returns false when current time is after restUntil (rest period finished)", () => {
    const restUntil = new Date(Date.now() - 60 * 60 * 1000); // 1 hour AGO
    const now       = new Date();
    expect(isDriverOnRest(restUntil, now)).toBe(false);
  });

  test("returns false when restUntil equals now exactly (rest just ended)", () => {
    const now = new Date();
    expect(isDriverOnRest(now, now)).toBe(false);
  });

  test("returns true for 30-minute rest — driver assigned 15 minutes after completing unlinked duty", () => {
    // Simulates: driver completed unlinked duty, restDuration=30min
    // Dispatcher tries to assign again 15 min later — should be blocked
    const restUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min remaining
    const now       = new Date();
    expect(isDriverOnRest(restUntil, now)).toBe(true);
  });

});

// ─────────────────────────────────────────────────────────────
// 4. checkBusConflict() — bus double-booking detection
// ─────────────────────────────────────────────────────────────
describe("checkBusConflict()", () => {

  // Shared existing schedules for this test block
  const existingSchedules = [
    {
      _id:           "sched_001",
      busId:         BUS_101,
      driverId:      DRIVER_A,
      routeId:       ROUTE_001,
      departureTime: "08:00",
      arrivalTime:   "12:00",
      dutyType:      "linked",
      status:        "scheduled",
    },
    {
      _id:           "sched_002",
      busId:         BUS_202,
      driverId:      DRIVER_B,
      routeId:       ROUTE_001,
      departureTime: "14:00",
      arrivalTime:   "18:00",
      dutyType:      "unlinked",
      status:        "scheduled",
    },
  ];

  test("detects conflict — same bus, overlapping window", () => {
    const result = checkBusConflict(BUS_101, "10:00", "14:00", existingSchedules);
    expect(result.conflict).toBe(true);
    expect(result.schedule._id).toBe("sched_001");
  });

  test("detects conflict — same bus, new schedule starts at existing departure (same start)", () => {
    const result = checkBusConflict(BUS_101, "08:00", "10:00", existingSchedules);
    expect(result.conflict).toBe(true);
  });

  test("no conflict — same time window but DIFFERENT bus", () => {
    const result = checkBusConflict(BUS_202, "08:00", "12:00", existingSchedules);
    // BUS_202 runs 14:00–18:00, so 08:00–12:00 on BUS_202 is fine
    expect(result.conflict).toBe(false);
  });

  test("no conflict — same bus, schedule ends exactly when existing starts (boundary touch)", () => {
    // BUS_101 is free before 08:00, so 06:00–08:00 should be allowed
    const result = checkBusConflict(BUS_101, "06:00", "08:00", existingSchedules);
    expect(result.conflict).toBe(false);
  });

  test("no conflict — same bus, completely separate later window", () => {
    // BUS_101 has 08:00–12:00, scheduling it at 14:00–16:00 is fine
    const result = checkBusConflict(BUS_101, "14:00", "16:00", existingSchedules);
    expect(result.conflict).toBe(false);
  });

  test("no conflict — empty existing schedules", () => {
    const result = checkBusConflict(BUS_101, "08:00", "12:00", []);
    expect(result.conflict).toBe(false);
  });

  // THE KEY BUG FIX TEST — different departureTime but overlapping window
  test("detects conflict — different departure time but windows overlap (was missed by original code)", () => {
    // BUS_101 runs 08:00–12:00. Scheduling at 09:00 (different exact time) should still conflict.
    // Original code did findOne({ busId, departureTime: "09:00" }) → found nothing → allowed it. WRONG.
    const result = checkBusConflict(BUS_101, "09:00", "13:00", existingSchedules);
    expect(result.conflict).toBe(true);
  });

});

// ─────────────────────────────────────────────────────────────
// 5. checkDriverConflict() — driver double-assignment detection
// ─────────────────────────────────────────────────────────────
describe("checkDriverConflict()", () => {

  const existingSchedules = [
    {
      _id:           "sched_003",
      busId:         BUS_101,
      driverId:      DRIVER_A,
      routeId:       ROUTE_001,
      departureTime: "08:00",
      arrivalTime:   "14:00",
      dutyType:      "linked",
      status:        "active",
    },
  ];

  test("detects conflict — same driver, overlapping window", () => {
    const result = checkDriverConflict(DRIVER_A, "10:00", "16:00", existingSchedules);
    expect(result.conflict).toBe(true);
    expect(result.schedule._id).toBe("sched_003");
  });

  test("no conflict — different driver, same window", () => {
    const result = checkDriverConflict(DRIVER_B, "08:00", "14:00", existingSchedules);
    expect(result.conflict).toBe(false);
  });

  test("no conflict — same driver, window starts when existing ends", () => {
    const result = checkDriverConflict(DRIVER_A, "14:00", "18:00", existingSchedules);
    expect(result.conflict).toBe(false);
  });

  test("detects conflict — same driver, window starts inside existing (bug fix test)", () => {
    // Driver A is on 08:00–14:00. New assignment at 11:00 (different exact time).
    // Original code: findOne({ driverId, departureTime: "11:00" }) → no match → allowed. WRONG.
    const result = checkDriverConflict(DRIVER_A, "11:00", "15:00", existingSchedules);
    expect(result.conflict).toBe(true);
  });

});

// ─────────────────────────────────────────────────────────────
// 6. checkLinkedDutyConflict() — driver linked to different bus
// ─────────────────────────────────────────────────────────────
describe("checkLinkedDutyConflict()", () => {

  const existingSchedules = [
    {
      _id:           "sched_004",
      busId:         BUS_101,
      driverId:      DRIVER_A,
      routeId:       ROUTE_001,
      departureTime: "08:00",
      arrivalTime:   "16:00",
      dutyType:      "linked",
      status:        "scheduled",
    },
  ];

  test("detects conflict — driver already linked to BUS_101, tries to link to BUS_202", () => {
    const result = checkLinkedDutyConflict(DRIVER_A, BUS_202, existingSchedules);
    expect(result.conflict).toBe(true);
    expect(result.message).toBe("Driver already linked to a different bus");
  });

  test("no conflict — driver linked to BUS_101, new schedule also uses BUS_101", () => {
    const result = checkLinkedDutyConflict(DRIVER_A, BUS_101, existingSchedules);
    expect(result.conflict).toBe(false);
  });

  test("no conflict — different driver, any bus", () => {
    const result = checkLinkedDutyConflict(DRIVER_B, BUS_202, existingSchedules);
    expect(result.conflict).toBe(false);
  });

  test("no conflict — driver has only unlinked schedules (not linked)", () => {
    const unlinkedOnly = [
      {
        _id:      "sched_005",
        busId:    BUS_101,
        driverId: DRIVER_A,
        dutyType: "unlinked",
        status:   "scheduled",
      },
    ];
    const result = checkLinkedDutyConflict(DRIVER_A, BUS_202, unlinkedOnly);
    expect(result.conflict).toBe(false);
  });

  test("no conflict — driver has completed linked schedule (status completed, not active/scheduled)", () => {
    const completedLinked = [
      {
        _id:      "sched_006",
        busId:    BUS_101,
        driverId: DRIVER_A,
        dutyType: "linked",
        status:   "completed", // completed — should not block
      },
    ];
    const result = checkLinkedDutyConflict(DRIVER_A, BUS_202, completedLinked);
    expect(result.conflict).toBe(false);
  });

  test("no conflict — empty schedule list", () => {
    const result = checkLinkedDutyConflict(DRIVER_A, BUS_101, []);
    expect(result.conflict).toBe(false);
  });

});

// ─────────────────────────────────────────────────────────────
// 7. Auth middleware — unit tests (no Express server needed)
// ─────────────────────────────────────────────────────────────
describe("authMiddleware", () => {

  const jwt = require("jsonwebtoken");
  const authMiddleware = require("../middleware/authMiddleware");

  const SECRET = "test_secret_key_for_jest";
  const mockNext = jest.fn();

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    mockNext.mockClear();
  });

  const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
  };

  test("calls next() and sets req.user when token is valid", () => {
    const token = jwt.sign({ id: "user123", role: "admin", name: "Rini" }, SECRET);
    const req   = { headers: { authorization: `Bearer ${token}` } };
    const res   = makeRes();

    authMiddleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe("user123");
    expect(req.user.role).toBe("admin");
  });

  test("returns 401 when Authorization header is missing", () => {
    const req = { headers: {} };
    const res = makeRes();

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "No token — access denied" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("returns 401 when header does not start with 'Bearer '", () => {
    const req = { headers: { authorization: "Token abc123" } };
    const res = makeRes();

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("returns 401 with expired message when token is expired", () => {
    const token = jwt.sign({ id: "user123", role: "viewer" }, SECRET, { expiresIn: "1ms" });
    // Wait a tick so token is definitely expired
    return new Promise((resolve) => setTimeout(() => {
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = makeRes();
      authMiddleware(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Token expired — please login again" });
      expect(mockNext).not.toHaveBeenCalled();
      resolve();
    }, 10));
  });

  test("returns 401 when token is signed with wrong secret (tampered)", () => {
    const token = jwt.sign({ id: "user123", role: "admin" }, "WRONG_SECRET");
    const req   = { headers: { authorization: `Bearer ${token}` } };
    const res   = makeRes();

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("returns 401 when token is a random garbage string", () => {
    const req = { headers: { authorization: "Bearer notavalidtoken.atall.ever" } };
    const res = makeRes();

    authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

});

// ─────────────────────────────────────────────────────────────
// 8. Role middleware — unit tests
// ─────────────────────────────────────────────────────────────
describe("roleMiddleware", () => {

  const roleMiddleware = require("../middleware/roleMiddleware");
  const mockNext = jest.fn();

  beforeEach(() => mockNext.mockClear());

  const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
  };

  test("calls next() when user role is in allowed roles", () => {
    const req = { user: { role: "admin" } };
    const res = makeRes();
    roleMiddleware("admin", "scheduler")(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  test("calls next() when scheduler is in allowed roles", () => {
    const req = { user: { role: "scheduler" } };
    const res = makeRes();
    roleMiddleware("admin", "scheduler")(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  test("returns 403 when viewer tries to access admin+scheduler route", () => {
    const req = { user: { role: "viewer" } };
    const res = makeRes();
    roleMiddleware("admin", "scheduler")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("returns 401 when req.user is missing (auth middleware did not run)", () => {
    const req = {};
    const res = makeRes();
    roleMiddleware("admin")(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("403 message includes required role and user's actual role", () => {
    const req = { user: { role: "viewer" } };
    const res = makeRes();
    roleMiddleware("admin")(req, res, mockNext);
    const jsonArg = res.json.mock.calls[0][0].message;
    expect(jsonArg).toContain("admin");
    expect(jsonArg).toContain("viewer");
  });

});