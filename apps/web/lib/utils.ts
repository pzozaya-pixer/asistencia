type ClassValue = string | false | null | undefined;

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatLookupValue(value: string) {
  if (value.length <= 4) {
    return value;
  }

  return `${value.slice(0, 3)}•••${value.slice(-2)}`;
}
