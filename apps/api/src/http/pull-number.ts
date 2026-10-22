export function pullNumber(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number)) {
    return null;
  }

  return number;
}
