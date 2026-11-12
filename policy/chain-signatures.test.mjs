import assert from "node:assert/strict";
import test from "node:test";
import { evaluate, sign } from "./chain-signatures.mjs";

const policy = {
  chains: ["near-testnet"],
  destinations: ["builder.testnet"],
  assets: ["PAPER"],
  maxAmount: 100n,
  usedNonces: new Set(["used"]),
};

const request = {
  chain: "near-testnet",
  destination: "builder.testnet",
  asset: "PAPER",
  amount: 10n,
  nonce: "fresh",
  expiry: 200,
};

test("policy rejects destination, cap, expiry, and replay", () => {
  assert.equal(evaluate(request, policy, 100).ok, true);
  assert.equal(evaluate({ ...request, destination: "attacker.testnet" }, policy, 100).ok, false);
  assert.equal(evaluate({ ...request, amount: 101n }, policy, 100).ok, false);
  assert.equal(evaluate({ ...request, expiry: 100 }, policy, 100).ok, false);
  assert.equal(evaluate({ ...request, nonce: "used" }, policy, 100).ok, false);
});

test("the policy module has no signer", () => {
  assert.throws(() => sign(), /cannot sign/);
});
