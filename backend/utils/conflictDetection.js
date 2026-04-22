// utils/conflictDetection.js
// Pure logic — no Express, no MongoDB, no req/res
// Extracted from scheduleController.js so it can be unit tested independently
//
// NOTE: departureTime and arrivalTime are stored as "HH:MM" strings in your schema.
// We convert them to comparable minutes-since-midnight integers for overlap math.

/**
 * Converts "HH:MM" string to total minutes since midnight.
 * Example: "08:30" → 510,  "14:00" → 840
 */
const toMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Core interval overlap formula.
 * Formula: newStart < existingEnd  AND  newEnd > existingStart
 * Boundary touches (08:00-12:00 and 12:00-16:00) are NOT overlaps.
 *
 * @param {string} newDep      - Incoming departureTime  "HH:MM"
 * @param {string} newArr      - Incoming arrivalTime    "HH:MM"
 * @param {string} existingDep - Existing departureTime  "HH:MM"
 * @param {string} existingArr - Existing arrivalTime    "HH:MM"
 * @returns {boolean}
 */
const hasTimeOverlap = (newDep, newArr, existingDep, existingArr) => {
  const newStart = toMinutes(newDep);
  const newEnd   = toMinutes(newArr);
  const exStart  = toMinutes(existingDep);
  const exEnd    = toMinutes(existingArr);
  return newStart < exEnd && newEnd > exStart;
};

/**
 * Checks whether a driver is currently within a rest period.
 * now is injectable so tests can control it without mocking Date.
 *
 * @param {Date|null} restUntil - driver.restUntil from Driver document
 * @param {Date}      now       - current time (default: new Date())
 * @returns {boolean} true = driver IS on rest, should be blocked
 */
const isDriverOnRest = (restUntil, now = new Date()) => {
  if (!restUntil) return false;
  return now < new Date(restUntil);
};

/**
 * Checks bus conflict against existing schedules.
 * Fixes the exact-match bug in scheduleController Step 3.
 *
 * @param {string}   busId
 * @param {string}   departureTime
 * @param {string}   arrivalTime
 * @param {Object[]} existingSchedules
 * @returns {{ conflict: boolean, schedule: Object|null }}
 */
const checkBusConflict = (busId, departureTime, arrivalTime, existingSchedules) => {
  for (const s of existingSchedules) {
    if (s.busId.toString() !== busId.toString()) continue;
    if (!hasTimeOverlap(departureTime, arrivalTime, s.departureTime, s.arrivalTime)) continue;
    return { conflict: true, schedule: s };
  }
  return { conflict: false, schedule: null };
};

/**
 * Checks driver conflict against existing schedules.
 * Fixes the exact-match bug in scheduleController Step 2.
 *
 * @param {string}   driverId
 * @param {string}   departureTime
 * @param {string}   arrivalTime
 * @param {Object[]} existingSchedules
 * @returns {{ conflict: boolean, schedule: Object|null }}
 */
const checkDriverConflict = (driverId, departureTime, arrivalTime, existingSchedules) => {
  for (const s of existingSchedules) {
    if (s.driverId.toString() !== driverId.toString()) continue;
    if (!hasTimeOverlap(departureTime, arrivalTime, s.departureTime, s.arrivalTime)) continue;
    return { conflict: true, schedule: s };
  }
  return { conflict: false, schedule: null };
};

/**
 * Checks linked duty conflict — same driver cannot be linked to two different buses.
 *
 * @param {string}   driverId
 * @param {string}   busId
 * @param {Object[]} existingSchedules
 * @returns {{ conflict: boolean, message: string|null }}
 */
const checkLinkedDutyConflict = (driverId, busId, existingSchedules) => {
  const previousLinked = existingSchedules.find(
    (s) =>
      s.driverId.toString() === driverId.toString() &&
      s.dutyType === "linked" &&
      ["scheduled", "active"].includes(s.status)
  );
  if (!previousLinked) return { conflict: false, message: null };

  const previousBusId = previousLinked.busId?.toString();
  if (previousBusId && previousBusId !== busId.toString()) {
    return { conflict: true, message: "Driver already linked to a different bus" };
  }
  return { conflict: false, message: null };
};

module.exports = {
  toMinutes,
  hasTimeOverlap,
  isDriverOnRest,
  checkBusConflict,
  checkDriverConflict,
  checkLinkedDutyConflict,
};