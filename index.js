import { onRequest } from "firebase-functions/v2/https";
import { createApp } from "./dist/index.js";

const appPromise = createApp({ serveClient: false }).then(({ app }) => app);

export const api = onRequest(
  {
    region: "us-central1",
    invoker: "public",
  },
  async (req, res) => {
    const app = await appPromise;
    return app(req, res);
  }
);

