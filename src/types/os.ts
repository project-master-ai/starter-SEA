export const OS = {
  WINDOWS: "windows",
  MACOS: "macos",
} as const;

export type OS = (typeof OS)[keyof typeof OS];
