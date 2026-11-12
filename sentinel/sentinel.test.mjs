import assert from "node:assert/strict";
import test from "node:test";
import { assertAllowed, plan } from "./sentinel.mjs";

test("sentinel plans only permissionless methods", () => {
  assert.equal(plan({ state: "EntryOpen", entry_end_ns: "10", campaign_end_ns: "20", claim_deadline_ns: "0" }, 10n), "activate_campaign");
  assert.equal(plan({ state: "Active", entry_end_ns: "10", campaign_end_ns: "20", claim_deadline_ns: "0" }, 20n), "finalize_campaign");
  assert.equal(plan({ state: "FinalizedSuccess", entry_end_ns: "10", campaign_end_ns: "20", claim_deadline_ns: "30" }, 30n), "sweep_expired_rewards");
  assert.equal(plan({ state: "Draft", entry_end_ns: "10", campaign_end_ns: "20", claim_deadline_ns: "0" }, 100n), null);
  assert.throws(() => assertAllowed("refund_sponsor"), /no authority/);
  assert.doesNotThrow(() => assertAllowed("finalize_campaign"));
});
