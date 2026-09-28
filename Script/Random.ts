import { App } from "Dora";

const UINT32_MAX = 4294967295;

export function doraRandom(): number {
  return App.rand / UINT32_MAX;
}
