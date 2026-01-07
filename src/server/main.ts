import express from "express";
import GuacaLog from "../libraries/guacalog/main";

const logger = GuacaLog.getInstance("cgconway.log");
const host = "localhost";
const port = 3000;

const request = (res: express.Response, exec: () => void) => {
  try {
    exec();
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    const stack = error.stack !== undefined ? error.stack : error.message;

    logger.log(import.meta.url, "error", stack);
    res.status(500).send({ message: error.message });
  }
};

const app = express();
app.use(express.json());
app.use(express.static("./dist/browser"));

app.get("/test", (_, res) =>
  request(res, () => {
    logger.log(import.meta.url, "info", "Test endpoint requested");
    res.json({ success: true });
  }),
);

app.listen(port, host, () => {
  logger.log(
    import.meta.url,
    "info",
    `Server running at http://${host}:${port}`,
  );
});
