import { match } from "ts-pattern";
import { OS } from "../types/os";

export const getOs = (): OS => {
  return match(process.platform)
    .with("win32", () => OS.WINDOWS)
    .with("darwin", () => OS.MACOS)
    .otherwise(() => {
      throw new Error("Unsupported platform");
    });
};
