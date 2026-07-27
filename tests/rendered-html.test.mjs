import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCharacterBlock,
  compositionFraming,
} from "../app/prompt-structure.mjs";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("keeps primary character details before additional characters without duplicates", () => {
  const primaryConcept = "A veteran elven ranger.";
  const primaryDetails = "Weathered green cloak and dark braided hair.";
  const additionalCharacter = "The young scout on the right is carrying a lantern.";
  const prompt = buildCharacterBlock(
    [primaryConcept, primaryDetails, primaryDetails],
    "2 different characters arranged in a two-character scene.",
    [additionalCharacter],
  );

  assert.ok(prompt.indexOf(primaryConcept) < prompt.indexOf(additionalCharacter));
  assert.ok(prompt.indexOf(primaryDetails) < prompt.indexOf(additionalCharacter));
  assert.equal(prompt.match(/Weathered green cloak and dark braided hair\./g)?.length, 1);
});

test("adds compact head-to-toe framing for full-body compositions", () => {
  const framing = compositionFraming("Full-body character");

  assert.equal(framing, "Full-body head-to-toe view with both feet visible.");
  assert.equal(compositionFraming("Character portrait"), "");
});
