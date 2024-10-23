import { randomUUID } from "node:crypto";
import { extension } from "mime-types";
import { open, readdir, readFile, rm } from "fs/promises";
import path from "path";
import querystring from "querystring";
import url from "url";

export const createFile = async (req, dirPath, wsServer) => {
  const fileName = `${randomUUID()}.${extension(req.headers["content-type"])}`;
  const file = await open(path.join(dirPath, fileName), "a");
  req.pipe(file.createWriteStream());

  wsServer.emit("action", `Added image ${fileName}`);

  return fileName;
};

export const listOfFiles = async (dirPath) => {
  const files = await readdir(dirPath);
  return JSON.stringify(files);
};

export const getFile = async (req, dirPath, fileName) => {
  const parsedUrl = url.parse(req.url);
  const { height, width } = querystring.parse(parsedUrl.query);

  const file = await readFile(path.join(dirPath, fileName));

  return { file, height, width };
};

export const deleteFile = async (dirPath, fileName, wsServer) => {
  await rm(path.join(dirPath, fileName));
  wsServer.emit("action", `Deleted image with name ${fileName}`);
};
