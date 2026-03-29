import moment from "moment";

/**
 * Convert different timestamp formats to seconds for moment.js
 * @param timestamp Timestamp in various formats (milliseconds, string date, ISO string)
 * @returns Seconds timestamp
 */
const toSeconds = (
  timestamp: number | string | undefined
): number | undefined => {
  if (!timestamp) return undefined;

  try {
    // Case 1: Already a number (milliseconds timestamp)
    if (typeof timestamp === "number") {
      return Math.floor(timestamp / 1000);
    }

    // Case 2: String that can be parsed as a number (milliseconds timestamp as string)
    if (!isNaN(Number(timestamp))) {
      return Math.floor(parseInt(timestamp) / 1000);
    }

    // Case 3: ISO or other date string format
    const parsedDate = new Date(timestamp);
    if (!isNaN(parsedDate.getTime())) {
      return Math.floor(parsedDate.getTime() / 1000);
    }

    // If we can't parse it properly, try to let moment handle it
    if (moment(timestamp).isValid()) {
      return moment(timestamp).unix();
    }

    console.warn("Unparseable timestamp format:", timestamp);
    return undefined;
  } catch (error) {
    console.error("Error converting timestamp to seconds:", error, timestamp);
    return undefined;
  }
};

/**
 * Format a date string into a readable format using Moment.js
 * @param dateString Date string or milliseconds timestamp to format
 * @returns Formatted date string
 */
export const formatDate = (dateString: string | number | undefined): string => {
  if (!dateString) return "N/A";

  try {
    const seconds = toSeconds(dateString);
    if (seconds === undefined) return "Invalid date";
    return moment.unix(seconds).format("MMM D, YYYY • h:mm A");
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString.toString();
  }
};

/**
 * Format a date string into a simple date format (no time)
 * @param dateString Date string or milliseconds timestamp to format
 * @returns Formatted date string
 */
export const formatSimpleDate = (
  dateString: string | number | undefined
): string => {
  if (!dateString) return "N/A";

  try {
    const seconds = toSeconds(dateString);
    if (seconds === undefined) return "Invalid date";
    return moment.unix(seconds).format("MMM D, YYYY");
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString.toString();
  }
};

/**
 * Format a date string to show only time
 * @param dateString Date string or milliseconds timestamp to format
 * @returns Formatted time string
 */
export const formatTime = (dateString: string | number | undefined): string => {
  if (!dateString) return "N/A";

  try {
    const seconds = toSeconds(dateString);
    if (seconds === undefined) return "Invalid date";
    return moment.unix(seconds).format("h:mm A");
  } catch (error) {
    console.error("Error formatting time:", error);
    return dateString.toString();
  }
};

/**
 * Format a date as relative time (e.g., "3 hours ago")
 * @param dateString Date string or milliseconds timestamp to format
 * @returns Relative time string
 */
export const formatRelativeTime = (
  dateString: string | number | undefined
): string => {
  if (!dateString) return "N/A";

  try {
    const seconds = toSeconds(dateString);
    if (seconds === undefined) return "Invalid date";
    return moment.unix(seconds).fromNow();
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return dateString.toString();
  }
};

/**
 * Format a date in calendar format (e.g., "Today", "Yesterday", or date)
 * @param dateString Date string or milliseconds timestamp to format
 * @returns Calendar format string
 */
export const formatCalendar = (
  dateString: string | number | undefined
): string => {
  if (!dateString) return "N/A";

  try {
    const seconds = toSeconds(dateString);
    if (seconds === undefined) return "Invalid date";
    return moment.unix(seconds).calendar(null, {
      sameDay: "[Today at] h:mm A",
      nextDay: "[Tomorrow at] h:mm A",
      nextWeek: "dddd [at] h:mm A",
      lastDay: "[Yesterday at] h:mm A",
      lastWeek: "[Last] dddd [at] h:mm A",
      sameElse: "MMM D, YYYY [at] h:mm A",
    });
  } catch (error) {
    console.error("Error formatting calendar date:", error);
    return dateString.toString();
  }
};

/**
 * Format a date range with start and end dates
 * @param startDate Start date string or milliseconds timestamp
 * @param endDate End date string or milliseconds timestamp
 * @returns Formatted date range string
 */
export const formatDateRange = (
  startDate: string | number | undefined,
  endDate: string | number | undefined
): string => {
  if (!startDate || !endDate) return "Date range not available";

  try {
    const startSeconds = toSeconds(startDate);
    const endSeconds = toSeconds(endDate);
    if (startSeconds === undefined || endSeconds === undefined)
      return "Invalid date range";
    const start = moment.unix(startSeconds).format("MMM D");
    const end = moment.unix(endSeconds).format("MMM D, YYYY");
    return `${start} - ${end}`;
  } catch (error) {
    console.error("Error formatting date range:", error);
    return `${startDate} - ${endDate}`;
  }
};
