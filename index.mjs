import WebSocketServer from "websocket";
import { createServer } from "node:http";
import { open, readFile, rm, readdir, access, mkdir } from "fs/promises";
import { randomUUID } from "node:crypto";
import { extension, contentType } from "mime-types";
import path from "path";

const IMAGES_DIR_NAME = "images";
const IMAGES_DIR_PATH = path.join(".", IMAGES_DIR_NAME);

const hasImagesDir = await access(IMAGES_DIR_PATH).then(
  () => true,
  () => false
);

if (!hasImagesDir) {
  await mkdir(IMAGES_DIR_PATH);
}

const port = 3000;

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/image") {
    const fileName = `${randomUUID()}.${extension(
      req.headers["content-type"]
    )}`;
    const file = await open(path.join(IMAGES_DIR_PATH, fileName), "a");
    req.pipe(file.createWriteStream());
    res.statusCode = 201;
    res.setHeader("Content-Type", "application/json");
    res.end(fileName);

    wsServer.emit("action", `Added image ${fileName}`);
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/image") &&
    !req.url.includes("images")
  ) {
    const fileName = req.url.split("/").pop();

    const file = await readFile(path.join(IMAGES_DIR_PATH, fileName)).catch(
      (error) => {
        console.log(error);
        res.statusCode = 404;
        res.end(
          JSON.stringify({
            message: `Image with name ${fileName} not found`,
          })
        );
      }
    );

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType(fileName));
    res.setHeader("Content-Disposition", `attachment; ${fileName}`);
    res.end(file);
    return;
  }

  if (req.method === "DELETE" && req.url.startsWith("/image")) {
    const fileName = req.url.split("/").pop();
    try {
      await rm(path.join(IMAGES_DIR_PATH, fileName));
      wsServer.emit("action", `Deleted image with name ${fileName}`);
    } catch (error) {
      console.log(error);
      res.statusCode = 404;
      res.end(
        JSON.stringify({
          message: `Image with name ${fileName} not found`,
        })
      );
    }

    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/images") {
    const files = await readdir(IMAGES_DIR_PATH);
    if (files.length > 0) {
      res.statusCode = 200;
      res.setHeader("Content-type", contentType("json"));
      res.end(JSON.stringify(files));
      return;
    }
    res.statusCode = 404;
    res.end(
      JSON.stringify({
        message: "Images not found",
      })
    );
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

const wsServer = new WebSocketServer.server({
  httpServer: server,
  autoAcceptConnections: false,
});

wsServer.on("action", function (request) {
  console.log(request);
});
