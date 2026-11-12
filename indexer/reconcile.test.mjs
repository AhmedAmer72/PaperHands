import assert from "node:assert/strict";
import test from "node:test";
import { difference } from "./reconcile.mjs";

test("ledger difference is zero when every bucket is labelled", () => {
  const books = {
    assets: "100",
    principal_liability: "40",
    sponsor_reward_liability: "20",
    survivor_bonus_liability: "15",
    protocol_reserve: "15",
    refund_liability: "10",
  };
  assert.equal(difference(books), 0n);
  assert.equal(difference({ ...books, assets: "99" }), -1n);
});
