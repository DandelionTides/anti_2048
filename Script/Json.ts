import { json } from "Dora";

export function encodeJson(value: object): string {
  const [encoded, error] = json.encode(value);
  if (encoded === undefined) throw new Error(error ?? "JSON encode failed");
  return encoded;
}

export function decodeJson<T>(value: string): T {
  const [decoded, error] = json.decode(value);
  if (decoded === undefined) throw new Error(error ?? "JSON decode failed");
  return decoded as T;
}
