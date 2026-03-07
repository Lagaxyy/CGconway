import { Client } from "pg";
import dotenv from "dotenv";
import { Config } from "@netlify/functions";

import Guacalog from "@/libraries/guacalog/main";

dotenv.config({ path: "secrets.env" });
const logger = Guacalog.getInstance("cgconway.log");

export const config: Config = {
  rateLimit: {
    windowLimit: 30,
    windowSize: 60,
    aggregateBy: ["ip"],
  },
};

export default async (request: Request) => {
  try {
    logger.log(
      import.meta.url,
      "info",
      `Received /getCanvas ${request.method} request !`,
    );

    if (request.method === "GET") {
      let result = undefined;
      const url = new URL(request.url);
      const searchParams = new URLSearchParams(url.search);

      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
      });

      await client.connect();
      if (searchParams.has("search")) {
        result = await client.query(
          "SELECT * FROM canvas WHERE LOWER(name) LIKE LOWER($1);",
          [`%${searchParams.get("search")}%`],
        );
      } else {
        result = await client.query("SELECT * FROM canvas;");
      }
      await client.end();

      return new Response(JSON.stringify(result));
    }

    throw Error("Endpoint not active.");
  } catch (error) {
    if (error instanceof Error) {
      logger.log(import.meta.url, "error", error.stack ?? error.message);

      return new Response(error.toString(), {
        status: 500,
      });
    }
  }
};
