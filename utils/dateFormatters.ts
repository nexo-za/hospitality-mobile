/**
 * Format a date string to a readable format
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // For today, show just the time
  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // For yesterday, show 'Yesterday' and the time
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // For other dates, show the full date and time
  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a date string to just the time
 */
export function formatTime(dateStr: string): string {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Invalid time";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Format currency amounts
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(amount);
}
