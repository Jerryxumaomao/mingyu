import type { SolarDateTimeInfo } from './baziTypes';
import { daysInSolarMonth } from '../calendar/date-validation';

export interface TrueSolarTimeResult {
  correctedTime: SolarDateTimeInfo;
  longitudeCorrectionMinutes: number;
  equationOfTimeMinutes: number;
  totalCorrectionMinutes: number;
}

function assertIntegerInRange(value: number, label: string, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label}需在 ${min}-${max} 之间。`);
  }
}

function validateSolarDate(year: number, month: number, day: number) {
  assertIntegerInRange(year, '年份', 1600, 2100);
  assertIntegerInRange(month, '月份', 1, 12);
  if (!Number.isInteger(day) || day < 1) {
    throw new Error('日期不能小于 1。');
  }

  const maxDay = daysInSolarMonth(year, month);
  if (day > maxDay) {
    throw new Error(`日期需在 1-${maxDay} 之间。`);
  }
}

function validateTimePart(hour: number, minute: number) {
  assertIntegerInRange(hour, '小时', 0, 23);
  assertIntegerInRange(minute, '分钟', 0, 59);
}

function validateLongitude(value: number, label: string) {
  if (!Number.isFinite(value) || value < -180 || value > 180) {
    throw new Error(`${label}需在 -180 到 180 之间。`);
  }
}

function toDateTimeInfo(date: Date): SolarDateTimeInfo {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

function julianDay(
  year: number,
  month: number,
  day: number,
  hourUT: number,
  minuteUT: number,
  secondUT: number,
): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const dayFrac = (hourUT + minuteUT / 60 + secondUT / 3600) / 24;
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + dayFrac + b - 1524.5
  );
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * 均时差(分钟),NOAA/Meeus 天文算法,1900-2100 精度约 ±数秒。
 * hour/minute 为当地标准钟表时,utcOffsetHours 为时区(东为正,默认东八区);
 * 缺省按当地正午计算(均时差日变化 <0.5 分钟,日级精度足够)。
 */
export function calculateEquationOfTimeMinutes(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
  utcOffsetHours = 8,
): number {
  validateSolarDate(year, month, day);
  const jd = julianDay(year, month, day, hour - utcOffsetHours, minute, 0);
  const T = (jd - 2451545) / 36525;
  const L0 = (((280.46646 + T * (36000.76983 + 0.0003032 * T)) % 360) + 360) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const seconds = 21.448 - T * (46.815 + T * (0.00059 - 0.001813 * T));
  const meanObliquity = 23 + (26 + seconds / 60) / 60;
  const omega = 125.04 - 1934.136 * T;
  const obliquity = meanObliquity + 0.00256 * Math.cos(rad(omega));
  let y = Math.tan(rad(obliquity) / 2);
  y *= y;
  const eotRadians =
    y * Math.sin(2 * rad(L0)) -
    2 * e * Math.sin(rad(M)) +
    4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) -
    0.5 * y * y * Math.sin(4 * rad(L0)) -
    1.25 * e * e * Math.sin(2 * rad(M));
  return 4 * ((eotRadians * 180) / Math.PI);
}

export function calculateTrueSolarTime(
  standardTime: Pick<SolarDateTimeInfo, 'year' | 'month' | 'day' | 'hour' | 'minute'>,
  longitude: number,
  standardMeridian = 120,
): TrueSolarTimeResult {
  validateSolarDate(standardTime.year, standardTime.month, standardTime.day);
  validateTimePart(standardTime.hour, standardTime.minute);
  validateLongitude(longitude, '经度');
  validateLongitude(standardMeridian, '标准经线');

  const equationOfTimeMinutes = calculateEquationOfTimeMinutes(
    standardTime.year,
    standardTime.month,
    standardTime.day,
    standardTime.hour,
    standardTime.minute,
    standardMeridian / 15,
  );
  const longitudeCorrectionMinutes = (longitude - standardMeridian) * 4;
  const totalCorrectionMinutes = equationOfTimeMinutes + longitudeCorrectionMinutes;

  const correctedDate = new Date(
    Date.UTC(
      standardTime.year,
      standardTime.month - 1,
      standardTime.day,
      standardTime.hour,
      standardTime.minute,
      0,
    ),
  );
  correctedDate.setTime(correctedDate.getTime() + totalCorrectionMinutes * 60000);

  return {
    correctedTime: toDateTimeInfo(correctedDate),
    longitudeCorrectionMinutes,
    equationOfTimeMinutes,
    totalCorrectionMinutes,
  };
}
