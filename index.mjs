import { prepare, createSimpleServer } from "./src/controller.mjs";

const dir = await prepare();

const port = process.env.PORT || 8000;

await createSimpleServer(dir, port);
