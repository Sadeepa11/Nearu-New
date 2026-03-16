/**
 * Formats a UTC date string to Sri Lanka Time (Asia/Colombo)
 * Format: "Jan 24, 2026, 08:30 AM"
 * @param utcDateString The UTC date string to format
 * @returns Formatted date string or empty string if input is invalid
 */
export const formatToSLTime = (utcDateString: string | number | Date | null | undefined) => {
    if (!utcDateString) return "";

    const date = new Date(utcDateString);

    if (isNaN(date.getTime())) return "";

    try {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Colombo',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        }).format(date);
    } catch (error) {
        console.warn("Date formatting error (Asia/Colombo):", error);
        // Fallback to local time if timezone is invalid on some environments (though Asia/Colombo is standard)
        return date.toLocaleString();
    }
};
