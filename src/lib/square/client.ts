import { SquareClient, SquareEnvironment } from "square";
import { squareEnvironment } from "@/lib/utils";

let cached: SquareClient | null = null;
let cachedToken = "";

/**
 * Personal access tokens stay in server environment variables.
 * A later OAuth install can replace this function with a per-seller token
 * lookup. Client components must never receive the token.
 */
export function squareClient() {
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
  if (!token) return null;
  if (!cached || cachedToken !== token) {
    cachedToken = token;
    cached = new SquareClient({
      token,
      environment: squareEnvironment() === "sandbox" ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
    });
  }
  return cached;
}
