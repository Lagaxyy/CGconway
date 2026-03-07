import { Client } from "pg";
import dotenv from "dotenv";
import { Config } from "@netlify/functions";

import Guacalog from "@/libraries/guacalog/main";
import { Flags } from "@/shared/config/flags";

const logger = Guacalog.getInstance("cgconway.log");

dotenv.config({ path: "secrets.env" });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const config: Config = {
  rateLimit: {
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ["ip"],
  },
};

export default async (request: Request) => {
  try {
    logger.log(import.meta.url, "debug", Flags);

    if (Flags.CONTEXT === "development") {
      logger.log(
        import.meta.url,
        "info",
        `Received /addCanvas ${request.method} request !`,
      );
    }

    if (Flags.API_ADD) {
      if (request.method === "POST") {
        const body = await request.json();

        await client.connect();
        await client.query(
          "INSERT INTO canvas (data, name, tag) VALUES ($1, $2, $3);",
          [body.data, body.name, body.tag],
        );
        await client.end();

        return new Response(JSON.stringify({ message: `OK` }), {
          status: 200,
        });
      }
    }

    throw Error("Endpoint not active.");
  } catch (error) {
    if (error instanceof Error) {
      logger.log(import.meta.url, "error", error.stack ?? error.message);

      return new Response(JSON.stringify({ errorMessage: error.message }), {
        status: 500,
      });
    }
  }
};
