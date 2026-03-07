import { Client } from "pg";
import dotenv from "dotenv";
import { Config } from "@netlify/functions";

import Guacalog from "@/libraries/guacalog/main";

dotenv.config({ path: "secrets.env" });
const logger = Guacalog.getInstance();

export const config: Config = {
  rateLimit: {
    windowLimit: 3,
    windowSize: 60,
    aggregateBy: ["ip"],
  },
};

export default async (request: Request) => {
  let result = undefined;
  let check = false;
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  logger.log(
    import.meta.url,
    "info",
    `Received /getCanvas ${request.method} request !`,
  );

  try {
    if (request.method === "GET") {
      check = true;

      const url = new URL(request.url);
      const searchParams = new URLSearchParams(url.search);

      await client.connect();
      if (searchParams.has("search")) {
        result = await client.query(
          "SELECT * FROM canvas WHERE LOWER(name) LIKE LOWER($1);",
          [`%${searchParams.get("search")}%`],
        );
      } else {
        result = await client.query("SELECT * FROM canvas;");
      }
    }

    if (!check) throw Error("Endpoint not active.");
  } catch (error) {
    if (error instanceof Error) {
      logger.log(import.meta.url, "error", error.stack ?? error.message);

      return new Response(JSON.stringify({ errorMessage: error.message }), {
        status: 500,
      });
    }
  } finally {
    await client.end();
  }

  return new Response(JSON.stringify(result));
};
