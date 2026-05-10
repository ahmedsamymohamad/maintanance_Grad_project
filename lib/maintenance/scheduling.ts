export const TECHNICIAN_BLOCK_WINDOW_MINUTES = 5 * 60

export const ACTIVE_TASK_STATUSES = ['assigned', 'in_progress', 'on_hold'] as const

export interface TechnicianScheduleEntry {
  assigned_to: string | null
  scheduled_date: string | null
  scheduled_time: string | null
}

export function toScheduledDateTime(date: string | null | undefined, time: string | null | undefined) {
  if (!date || !time) {
    return null
  }

  const scheduledDateTime = new Date(`${date}T${time}:00`)
  return Number.isNaN(scheduledDateTime.getTime()) ? null : scheduledDateTime
}

export function hasTechnicianConflict(
  existingSchedule: TechnicianScheduleEntry,
  targetDate: string,
  targetTime: string | null,
) {
  if (!existingSchedule.scheduled_date) {
    return false
  }

  const targetDateTime = toScheduledDateTime(targetDate, targetTime)
  const existingDateTime = toScheduledDateTime(existingSchedule.scheduled_date, existingSchedule.scheduled_time)

  if (targetDateTime && existingDateTime) {
    return Math.abs(existingDateTime.getTime() - targetDateTime.getTime()) < TECHNICIAN_BLOCK_WINDOW_MINUTES * 60_000
  }

  return existingSchedule.scheduled_date === targetDate
}

export function getAvailableTechnicianIds(
  technicianIds: string[],
  schedules: TechnicianScheduleEntry[],
  targetDate: string,
  targetTime: string | null,
) {
  const busyTechnicians = new Set<string>()

  for (const schedule of schedules) {
    if (!schedule.assigned_to) {
      continue
    }

    if (hasTechnicianConflict(schedule, targetDate, targetTime)) {
      busyTechnicians.add(schedule.assigned_to)
    }
  }

  return technicianIds.filter((technicianId) => !busyTechnicians.has(technicianId))
}
