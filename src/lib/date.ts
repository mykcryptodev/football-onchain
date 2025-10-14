const DEFAULT_LOCALE: Intl.LocalesArgument = "en-US";
const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
};
const DEFAULT_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

interface KickoffFormatOptions {
  locales?: Intl.LocalesArgument;
  dateOptions?: Intl.DateTimeFormatOptions;
  timeOptions?: Intl.DateTimeFormatOptions;
  separator?: string;
}

export function formatKickoffTime(
  kickoff?: string | null,
  options: KickoffFormatOptions = {},
) {
  if (!kickoff) {
    return "TBD";
  }

  const date = new Date(kickoff);

  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }

  const {
    locales = DEFAULT_LOCALE,
    dateOptions = DEFAULT_DATE_OPTIONS,
    timeOptions = DEFAULT_TIME_OPTIONS,
    separator = " ",
  } = options;

  const datePart = date.toLocaleDateString(locales, dateOptions);
  const timePart = date.toLocaleTimeString(locales, timeOptions);

  return `${datePart}${separator}${timePart}`;
}
