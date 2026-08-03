/**
 * Date utility functions for IST timezone and dd/mm/yyyy format
 * All date operations in the application should use these utilities
 */

/**
 * Format date to dd/mm/yyyy format in IST timezone
 * @param date - Date object, string, or null
 * @returns Formatted date string or null
 */
export function formatDateDDMMYYYY(date: Date | string | null): string | null {
  if (!date) return null

  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Format date to dd/mm/yyyy HH:mm format in IST timezone (12-hour format with AM/PM)
 * @param date - Date object, string, or null
 * @returns Formatted date-time string or null
 */
export function formatDateDDMMYYYYTime(date: Date | string | null): string | null {
  if (!date) return null

  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours24 = d.getHours()
  const hours = hours24 % 12 || 12 // Convert to 12-hour format
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours24 >= 12 ? 'PM' : 'AM'
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`
}

/**
 * Get current timestamp in IST timezone for comparison
 * @param dateInput - Date object or string
 * @returns Timestamp in milliseconds
 */
export function getISTTimestamp(dateInput: Date | string): number {
  const date = new Date(dateInput)

  // Check if this is midnight UTC (intended as date-only in local timezone)
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
    // Extract YYYY-MM-DD from the ISO string
    const isoString = date.toISOString()
    const [year, month, day] = isoString.split('T')[0].split('-').map(Number)

    // Create new date in local timezone (IST)
    return new Date(year, month - 1, day, 0, 0, 0, 0).getTime()
  }

  return date.getTime()
}

/**
 * Parse date with timezone awareness
 * Handles UTC midnight dates by treating them as local midnight
 * @param date - Date object, string, or null
 * @returns Date object in local timezone
 */
export function parseDateWithTimezone(date: Date | string | null): Date {
  if (!date) return new Date()

  const dateObj = date instanceof Date ? date : new Date(date)

  // Check if this is midnight UTC (intended as date-only in local timezone)
  if (dateObj.getUTCHours() === 0 && dateObj.getUTCMinutes() === 0 && dateObj.getUTCSeconds() === 0) {
    const year = dateObj.getUTCFullYear()
    const month = dateObj.getUTCMonth()
    const day = dateObj.getUTCDate()

    // Create date in local timezone (IST)
    return new Date(year, month, day, 0, 0, 0, 0)
  }

  return dateObj
}

/**
 * Get date parts for display in dd/mm/yyyy format
 * @param date - Date object, string, or null
 * @returns Object with day, month, year properties or null
 */
export function getDateParts(date: Date | string | null): { day: string; month: string; year: string } | null {
  if (!date) return null

  const d = new Date(date)
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: String(d.getMonth() + 1).padStart(2, '0'),
    year: String(d.getFullYear())
  }
}

/**
 * Get time parts for display in HH:mm format (12-hour format with AM/PM)
 * @param date - Date object, string, or null
 * @returns Object with hours, minutes, ampm properties or null
 */
export function getTimeParts(date: Date | string | null): { hours: string; minutes: string; ampm: string } | null {
  if (!date) return null

  const d = new Date(date)
  const hours24 = d.getHours()
  const hours = String(hours24 % 12 || 12).padStart(2, '0') // Convert to 12-hour format
  return {
    hours,
    minutes: String(d.getMinutes()).padStart(2, '0'),
    ampm: hours24 >= 12 ? 'PM' : 'AM'
  }
}
