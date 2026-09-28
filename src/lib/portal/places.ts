/*
 * Countries, Tamil Nadu districts and time zones for portal forms. Plain data
 * with no dependencies, so client forms and server validation share it.
 */

/** Two-letter country codes (the international country-code standard). */
const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );

/** Where most NRIs from Tamil Nadu live; listed first. */
const COMMON_COUNTRIES = ["AE", "US", "GB", "SG", "CA", "AU", "SA", "QA", "KW", "OM", "BH", "MY", "NZ", "DE", "IN"];

export const isCountryCode = (value: string) => COUNTRY_CODES.includes(value);

let regionNames: Intl.DisplayNames | undefined;
export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function countryOptions(): { common: { value: string; label: string }[]; all: { value: string; label: string }[] } {
  const toOption = (code: string) => ({ value: code, label: countryName(code) });
  return {
    common: COMMON_COUNTRIES.map(toOption),
    all: COUNTRY_CODES.filter((c) => !COMMON_COUNTRIES.includes(c))
      .map(toOption)
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

/** The 38 districts of Tamil Nadu. */
export const tamilNaduDistricts = [
  "Ariyalur",
  "Chengalpattu",
  "Chennai",
  "Coimbatore",
  "Cuddalore",
  "Dharmapuri",
  "Dindigul",
  "Erode",
  "Kallakurichi",
  "Kancheepuram",
  "Kanniyakumari",
  "Karur",
  "Krishnagiri",
  "Madurai",
  "Mayiladuthurai",
  "Nagapattinam",
  "Namakkal",
  "Nilgiris",
  "Perambalur",
  "Pudukkottai",
  "Ramanathapuram",
  "Ranipet",
  "Salem",
  "Sivaganga",
  "Tenkasi",
  "Thanjavur",
  "Theni",
  "Thoothukudi",
  "Tiruchirappalli",
  "Tirunelveli",
  "Tirupathur",
  "Tiruppur",
  "Tiruvallur",
  "Tiruvannamalai",
  "Tiruvarur",
  "Vellore",
  "Viluppuram",
  "Virudhunagar",
] as const;

export const isTamilNaduDistrict = (value: string) => (tamilNaduDistricts as readonly string[]).includes(value);

/** A time zone the runtime can format dates in (accepts IANA names and their aliases). */
export function isTimeZone(value: string): boolean {
  if (!value || value.length > 64 || !/^[A-Za-z]+(\/[A-Za-z0-9_+-]+)*$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** All time zones, grouped by region for a <select>. */
export function timeZoneGroups(current?: string | null): { region: string; zones: string[] }[] {
  const zones = new Set(typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["Asia/Kolkata", "UTC"]);
  if (current && isTimeZone(current)) zones.add(current);
  const groups = new Map<string, string[]>();
  for (const zone of [...zones].sort()) {
    const region = zone.includes("/") ? zone.split("/")[0] : "Other";
    if (!groups.has(region)) groups.set(region, []);
    groups.get(region)!.push(zone);
  }
  return [...groups].map(([region, list]) => ({ region, zones: list }));
}

export const DEFAULT_TIMEZONE = "Asia/Kolkata";
