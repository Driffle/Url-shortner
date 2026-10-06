#!/usr/bin/env npx tsx
/**
 * Phase 1 click consumer — same image as web, separate process.
 * Reads `dl:stream:clicks`, persists batches to Postgres, drains legacy `dl:queue:clicks`.
 */
import { runClickWorkerLoop } from "@/server/services/click-worker.service";

const controller = new AbortController();
process.on("SIGINT", () => controller.abort());
process.on("SIGTERM", () => controller.abort());

async function main(): Promise<void> {
  console.log(JSON.stringify({ event: "click_worker_start", pid: process.pid }));
  await runClickWorkerLoop(controller.signal);
  console.log(JSON.stringify({ event: "click_worker_stop" }));
}

main().catch((err) => {
  console.error(JSON.stringify({ event: "click_worker_fatal", message: String(err) }));
  process.exit(1);
});
