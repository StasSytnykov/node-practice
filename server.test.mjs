import axios from "axios";
import { tmpdir } from "node:os";
import { createSimpleServer } from "./server.mjs";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { emptyDir } from "fs-extra";

const UUID_REGEX =
  /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;

describe("Integretion tests", () => {
  let dir;
  let server;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "images"));
    server = await createSimpleServer(dir);

    await new Promise((resolve) => {
      server.once("listening", resolve);
      axios.defaults.baseURL = `http://localhost:${server.address().port}`;
    });
  });

  afterEach(async () => {
    await emptyDir(dir);
  });

  afterAll(async () => {
    await server.close();
    await rm(dir, { recursive: true, force: true });
  });

  describe("POST / image", () => {
    test("save file with correct extension and name", async () => {
      await axios.post("/image", Buffer.alloc(1024), {
        headers: {
          "Content-Type": "image/jpeg",
        },
      });
      const [file] = await readdir(dir);
      const [fileName, fileExtension] = file.split(".");

      expect(fileName).toMatch(UUID_REGEX);
      expect(fileExtension).toBe("jpeg");
    });

    test("response contains correct code and filename", async () => {
      const response = await axios.post("/image", Buffer.alloc(1024), {
        headers: {
          "Content-Type": "image/jpeg",
        },
      });

      const [file] = await readdir(dir);

      expect(response.data).toBe(file);
      expect(response.status).toBe(201);
    });
  });

  describe("GET / images", () => {
    test("get list of images", async () => {
      const response = await axios("/images");
      const images = await readdir(dir);

      expect(response.data.length).toBe(images.length);
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE / image", () => {
    test("delete one image", async () => {
      await axios.post("/image", Buffer.alloc(1024), {
        headers: {
          "Content-Type": "image/jpeg",
        },
      });
      const files = await readdir(dir);
      const response = await axios.delete(`/image/${files[0]}`);

      expect(response.status).toBe(204);
    });

    test("show error code 404 if we don't have this image", async () => {
      let requestStatus;

      const files = await readdir(dir);
      try {
        await axios.delete(`/image/${files[0]}`);
      } catch (error) {
        requestStatus = error.status;
      }

      expect(requestStatus).toBe(404);
    });
  });
});
