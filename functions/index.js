import { onRequest } from "firebase-functions/v2/https";
import { middleware } from "../.output/server/index.mjs";

export const ssr = onRequest(middleware);
