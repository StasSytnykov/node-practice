import WebSocketServer from "websocket";
import { createServer } from "node:http";
import { open, readFile, rm, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 3000;

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/image") {
    const id = Math.random().toFixed(3);
    const file = await open(`${__dirname}/images/image-${id}.png`, "a");
    const writableFile = file.createWriteStream();
    req.pipe(writableFile);
    wsServer.emit("action", `Added image with name image-${id}.png`);
    res.statusCode = 201;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        fileName: `image${id}`,
      })
    );
    return;
  }

  if (
    req.method === "GET" &&
    req.url.startsWith("/image") &&
    !req.url.includes("images")
  ) {
    const slicedURL = req.url.slice(6);

    const file = await readFile(`${__dirname}/images${slicedURL}.png`).catch(
      (error) => {
        console.log(error);
        res.statusCode = 404;
        res.end(
          JSON.stringify({
            message: `Image with name ${slicedURL} not found`,
          })
        );
      }
    );

    res.statusCode = 200;
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; ${slicedURL}.png`);
    res.write(file);
    res.end();
    return;
  }

  if (req.method === "DELETE" && req.url.startsWith("/image")) {
    const slicedURL = req.url.slice(6);
    try {
      await rm(`${__dirname}/images${slicedURL}.png`);
      wsServer.emit("action", `Deleted image with name ${slicedURL}.png`);
    } catch (error) {
      console.log(error);
      res.statusCode = 404;
      res.end(
        JSON.stringify({
          message: `Image with name ${slicedURL} not found`,
        })
      );
    }

    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/images") {
    const files = await readdir(`${__dirname}/images/`);
    if (files.length > 0) {
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          fileNames: [...files],
        })
      );
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
  console.log(new Date() + " Connection accepted.");
  console.log(request);
});
