import { prepare, createSimpleServer } from "./server.mjs";

const dir = await prepare();

await createSimpleServer(dir);
