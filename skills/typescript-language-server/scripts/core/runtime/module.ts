import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function isExecutedAsMain(moduleUrl: string): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return resolve(process.argv[1]) === resolve(fileURLToPath(moduleUrl));
}
