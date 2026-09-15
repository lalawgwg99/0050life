export function toSerial(year: number, month: number): number {
  return year * 12 + month - 1;
}

export function fromSerial(serial: number): { year: number; month: number } {
  return { year: Math.floor(serial / 12), month: (serial % 12) + 1 };
}

export function birthSerial(birthYearROC: number, birthMonth: number): number {
  return toSerial(birthYearROC + 1911, birthMonth);
}

export function monthAtAge(birth: number, age: number): number {
  return birth + Math.round(age * 12);
}

export function ageAtMonth(birth: number, month: number): number {
  return (month - birth) / 12;
}

export function formatYearMonth(serial: number): string {
  const { year, month } = fromSerial(serial);
  return `${year}/${String(month).padStart(2, "0")}`;
}
