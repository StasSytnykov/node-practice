import WebSocketServer from "websocket";
import { createServer } from "node:http";
import { open, readFile, rm, readdir, access, mkdir } from "fs/promises";
import { randomUUID } from "node:crypto";
import { extension, contentType } from "mime-types";
import querystring from "querystring";
import url from "url";
import path from "path";
import sharp from "sharp";

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

export const createSimpleServer = async (dirPath) => {
  const server = createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/image") {
      try {
        const fileName = `${randomUUID()}.${extension(
          req.headers["content-type"]
        )}`;
        const file = await open(path.join(dirPath, fileName), "a");
        req.pipe(file.createWriteStream());
        res.statusCode = 201;
        res.setHeader("Content-Type", "application/json");
        res.end(fileName);

        wsServer.emit("action", `Added image ${fileName}`);
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
      try {
        const fileName = req.url.includes("?")
          ? req.url.split("/").pop().split("?")[0]
          : req.url.split("/").pop();
        const parsedUrl = url.parse(req.url);
        const { height, width } = querystring.parse(parsedUrl.query);

        const file = await readFile(path.join(dirPath, fileName));

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
        await rm(path.join(dirPath, fileName));
        wsServer.emit("action", `Deleted image with name ${fileName}`);
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
        const files = await readdir(dirPath);

        res.statusCode = 200;
        res.setHeader("Content-type", contentType("json"));
        res.end(JSON.stringify(files));
      } catch (error) {
        res.setHeader("Content-type", contentType("html"));
        res.statusCode = 404;
        res.end("<h1>Not Found</h1>");
      }
    }
  });

  server.listen(() => {
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
