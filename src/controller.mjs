import WebSocketServer from "websocket";
import { createServer } from "node:http";
import { access, mkdir, readFile } from "fs/promises";
import { contentType } from "mime-types";
import path from "path";
import sharp from "sharp";
import morgan from "morgan";
import winston from "winston";
import { createFile, listOfFiles, getFile, deleteFile } from "./model.mjs";

const winstonLogger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "error" : "debug",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

const logger = morgan("combined", {
  skip: function (req, res) {
    return process.env.NODE_ENV === "production" ? res.statusCode < 400 : false;
  },
  stream: { write: (message) => winstonLogger.info(message.trim()) },
});

export const prepare = async () => {
  const IMAGES_DIR_NAME = "images";
  const IMAGES_DIR_PATH = path.join(".", IMAGES_DIR_NAME);

  const hasImagesDir = await access(IMAGES_DIR_PATH).then(
    () => true,
    () => false
  );

  if (!hasImagesDir) {
    await mkdir(IMAGES_DIR_PATH);
  }

  return IMAGES_DIR_PATH;
};

export const createSimpleServer = async (dirPath, port) => {
  const server = createServer(async (req, res) => {
    logger(req, res, async (error) => {
      if (error) {
        res.statusCode = 500;
        res.end("Server Error");
        return;
      }

      if (req.method === "POST" && req.url === "/image") {
        try {
          const data = await createFile(req, dirPath, wsServer);
          res.statusCode = 201;
          res.setHeader("Content-Type", "application/json");
          res.end(data);
        } catch (error) {
          console.log(error);
          res.setHeader("Content-type", contentType("html"));
          res.statusCode = 404;
          res.end("<h1>Not Found</h1>");
        }
      }

      if (
        req.method === "GET" &&
        req.url.startsWith("/image") &&
        !req.url.includes("images")
      ) {
        const fileName = req.url.includes("?")
          ? req.url.split("/").pop().split("?")[0]
          : req.url.split("/").pop();
        try {
          const { file, height, width } = await getFile(req, dirPath, fileName);

          if (height && width) {
            const resizedFile = await sharp(file)
              .resize(Number(height), Number(width))
              .toBuffer();
            res.statusCode = 200;
            res.setHeader("Content-Type", contentType(fileName));
            res.setHeader("Content-Disposition", `attachment; ${fileName}`);
            res.end(resizedFile);
          } else {
            res.statusCode = 200;
            res.setHeader("Content-Type", contentType(fileName));
            res.setHeader("Content-Disposition", `attachment; ${fileName}`);
            res.end(file);
          }
        } catch (error) {
          console.log(error);
          res.setHeader("Content-type", contentType("html"));
          res.statusCode = 404;
          res.end("<h1>Not Found</h1>");
        }
      }

      if (req.method === "DELETE" && req.url.startsWith("/image")) {
        const fileName = req.url.split("/").pop();
        try {
          await deleteFile(dirPath, fileName, wsServer);
          res.statusCode = 204;
          res.end();
        } catch (error) {
          res.setHeader("Content-type", contentType("html"));
          res.statusCode = 404;
          res.end(`<h1>Image with name ${fileName} not found!</h1>`);
        }
      }

      if (req.method === "GET" && req.url === "/images") {
        try {
          const data = await listOfFiles(dirPath);
          res.statusCode = 200;
          res.setHeader("Content-type", contentType("json"));
          res.end(data);
        } catch (error) {
          res.setHeader("Content-type", contentType("html"));
          res.statusCode = 404;
          res.end("<h1>Not Found</h1>");
        }
      }

      if (req.url === "/swagger-api") {
        try {
          const file = await readFile(path.join("./swagger", "index.html"));

          res.writeHead(200, { "Content-Type": contentType("html") });
          res.end(file, "utf-8");
        } catch (error) {
          res.setHeader("Content-type", contentType("html"));
          res.statusCode = 404;
          res.end("<h1>Swagger not found</h1>");
        }
      }
    });
  });

  server.listen(port, () => {
    console.log(`Server running at http://localhost:${server.address().port}/`);
  });

  const wsServer = new WebSocketServer.server({
    httpServer: server,
    autoAcceptConnections: false,
  });

  wsServer.on("action", function (request) {
    console.log(request);
  });

  return server;
};
