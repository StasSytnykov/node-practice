import { prepare, createSimpleServer } from "./src/controller.mjs";

const dir = await prepare();

await createSimpleServer(dir, 4000);
