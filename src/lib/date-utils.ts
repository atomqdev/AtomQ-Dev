/**
 * Date utility functions for IST timezone and dd/mm/yyyy format
 * All date operations in the application should use these utilities
 */

// IST timezone constant
export const IST_TIMEZONE = 'Asia/Calcutta'

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
 * Format date to dd/mm/yyyy HH:mm format in IST timezone
 * @param date - Date object, string, or null
 * @returns Formatted date-time string or null
 */
export function formatDateDDMMYYYYTime(date: Date | string | null): string | null {
  if (!date) return null

  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Format date to dd/mm/yyyy HH:mm:ss format in IST timezone
 * @param date - Date object, string, or null
 * @returns Formatted date-time string or null
 */
export function formatDateDDMMYYYYTimeSeconds(date: Date | string | null): string | null {
  if (!date) return null

  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
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
 * Get current date in IST timezone
 * @returns Date object representing current IST time
 */
export function getCurrentISTDate(): Date {
  return new Date()
}

/**
 * Get start of day in IST timezone
 * @param date - Date object or string (defaults to current date)
 * @returns Date object at 00:00:00 in IST
 */
export function getStartOfDayIST(date: Date | string = new Date()): Date {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

/**
 * Get end of day in IST timezone
 * @param date - Date object or string (defaults to current date)
 * @returns Date object at 23:59:59.999 in IST
 */
export function getEndOfDayIST(date: Date | string = new Date()): Date {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
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
 * Format date using Intl.DateTimeFormat with IST timezone
 * @param date - Date object, string, or null
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string or null
 */
export function formatDateIST(
  date: Date | string | null,
  options: Intl.DateTimeFormatOptions = {}
): string | null {
  if (!date) return null

  const d = new Date(date)
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  }

  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(d)
}

/**
 * Format time using Intl.DateTimeFormat with IST timezone
 * @param date - Date object, string, or null
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted time string or null
 */
export function formatTimeIST(
  date: Date | string | null,
  options: Intl.DateTimeFormatOptions = {}
): string | null {
  if (!date) return null

  const d = new Date(date)
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }

  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(d)
}

/**
 * Format date and time using Intl.DateTimeFormat with IST timezone
 * @param date - Date object, string, or null
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date-time string or null
 */
export function formatDateTimeIST(
  date: Date | string | null,
  options: Intl.DateTimeFormatOptions = {}
): string | null {
  if (!date) return null

  const d = new Date(date)
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }

  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(d)
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
 * Get time parts for display in HH:mm format
 * @param date - Date object, string, or null
 * @returns Object with hours, minutes properties or null
 */
export function getTimeParts(date: Date | string | null): { hours: string; minutes: string } | null {
  if (!date) return null

  const d = new Date(date)
  return {
    hours: String(d.getHours()).padStart(2, '0'),
    minutes: String(d.getMinutes()).padStart(2, '0')
  }
}

/**
 * Get time parts with seconds for display in HH:mm:ss format
 * @param date - Date object, string, or null
 * @returns Object with hours, minutes, seconds properties or null
 */
export function getTimePartsWithSeconds(date: Date | string | null): { hours: string; minutes: string; seconds: string } | null {
  if (!date) return null

  const d = new Date(date)
  return {
    hours: String(d.getHours()).padStart(2, '0'),
    minutes: String(d.getMinutes()).padStart(2, '0'),
    seconds: String(d.getSeconds()).padStart(2, '0')
  }
}
