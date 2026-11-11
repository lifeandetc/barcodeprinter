import { statusOf } from "@/lib/square/errors";

export async function withBackoff<T>(operation: () => Promise<T>, attempts = 5) {
  let delay = 500;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const status = statusOf(error);
      if ((status !== 429 && status !== 503) || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error("Square request failed.");
}
