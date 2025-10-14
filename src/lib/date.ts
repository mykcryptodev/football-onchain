export function formatKickoffTime(
  kickoff?: string | null,
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!kickoff) {
    return "TBD";
  }

  const date = new Date(kickoff);

  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }

  return date.toLocaleString(locales, options);
}
