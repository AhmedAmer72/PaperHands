import assert from "node:assert/strict";
import test from "node:test";
import { quoteStatus, recordJoinFromQuote } from "./intents.mjs";

test("a quote is not a join", () => {
  assert.equal(quoteStatus().connected, false);
  assert.throws(() => recordJoinFromQuote(), /PAPER arrives/);
});
