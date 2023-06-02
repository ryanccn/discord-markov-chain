import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export const ensureDirectory = async (user: string) => {
  await mkdir(join("data", user), { recursive: true });
};

export const readMessages = async (user: string) => {
  await ensureDirectory(user);

  const contents = await readFile(join("data", user, "messages.json"), {
    encoding: "utf-8",
  });

  return JSON.parse(contents) as string[];
};

export const readProgress = async (user: string) => {
  await ensureDirectory(user);

  const contents = await readFile(join("data", user, "progress.json"), {
    encoding: "utf-8",
  });

  return JSON.parse(contents) as Record<string, string | null>;
};

export const writeMessages = async (user: string, data: string[]) => {
  await ensureDirectory(user);

  await writeFile(join("data", user, "messages.json"), JSON.stringify(data));
};

export const updateProgress = async (
  user: string,
  channel: string,
  message: string | null
) => {
  await ensureDirectory(user);

  let progress: Record<string, string | null> = {};

  try {
    progress = await readProgress(user);
  } catch {
    /* */
  }

  progress[channel] = message;

  await writeFile(
    join("data", user, "progress.json"),
    JSON.stringify(progress)
  );
};
