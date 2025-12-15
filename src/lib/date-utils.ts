/**
 * Date utility functions for consistent UTC date handling across the application
 */

/**
 * Normalizes a date string or Date object to UTC, extracting only the date components
 * This ensures consistent date handling regardless of timezone
 * @param date - Date string (YYYY-MM-DD) or Date object
 * @returns Date object normalized to UTC midnight
 */
export function normalizeDateToUTC(date: string | Date): Date {
  let dateObj: Date
  
  if (typeof date === 'string') {
    // If it's a string, parse it as UTC date directly
    // Handle both YYYY-MM-DD and Date objects
    if (date.includes('T')) {
      dateObj = new Date(date)
    } else {
      // For YYYY-MM-DD format, create UTC date directly
      const [year, month, day] = date.split('-').map(Number)
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    }
  } else {
    dateObj = date
  }
  
  // Extract UTC components to avoid timezone conversion issues
  const year = dateObj.getUTCFullYear()
  const month = dateObj.getUTCMonth()
  const day = dateObj.getUTCDate()
  
  // Create date in UTC
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
}

/**
 * Creates a date range for filtering, ensuring start date is at UTC midnight
 * and end date includes the entire day by using the start of the next day (exclusive)
 * This ensures we capture all dates that fall within the date range, even if
 * they were stored with different time components
 * @param startDate - Start date string (YYYY-MM-DD) or Date object
 * @param endDate - End date string (YYYY-MM-DD) or Date object
 * @returns Object with normalized start and end dates (end is exclusive - start of next day)
 */
export function createDateRange(startDate: string | Date, endDate: string | Date): { start: Date; end: Date } {
  const start = normalizeDateToUTC(startDate)
  const end = normalizeDateToUTC(endDate)
  
  // Instead of setting end to 23:59:59.999, we set it to the start of the next day
  // This way we can use `lt` (less than) instead of `lte` (less than or equal)
  // which ensures we include ALL dates from the end date, regardless of time component
  end.setUTCDate(end.getUTCDate() + 1)
  end.setUTCHours(0, 0, 0, 0)
  
  return { start, end }
}

/**
 * Gets the weekday (1=Monday, 7=Sunday) from a date using UTC
 * @param date - Date string (YYYY-MM-DD) or Date object
 * @returns Weekday number (1-7)
 */
export function getWeekdayUTC(date: string | Date): number {
  const normalized = normalizeDateToUTC(date)
  const weekday = normalized.getUTCDay()
  // Convert from JavaScript's 0=Sunday to our 1=Monday, 7=Sunday format
  return weekday === 0 ? 7 : weekday
}

/**
 * Formats a date to YYYY-MM-DD string using UTC
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

