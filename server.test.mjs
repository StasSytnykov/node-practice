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

  afterAll(async () => {
    await emptyDir(dir);
  });

  afterAll(async () => {
    await server.close();
    await rm(dir, { recursive: true, force: true });
  });

  describe("POST / image", () => {
    test("save file with correct extension", async () => {
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
  });
});
