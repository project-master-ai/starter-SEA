import { match } from "ts-pattern";
import { OS } from "./types/os";
import { getOs } from "./utils/getOs";
import { setupMacOs } from "./setupMacOS";
import { setupWindows } from "./setupWindows";

match(getOs())
  .with(OS.MACOS, setupMacOs)
  .with(OS.WINDOWS, setupWindows)
  .exhaustive();
