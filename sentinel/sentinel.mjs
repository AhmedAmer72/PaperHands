import { pathToFileURL } from "node:url";

// Read-only watcher for SponsorHub. It never holds a key.
// A later operator can broadcast only the three permissionless methods.

const ALLOWED = new Set(["activate_campaign", "finalize_campaign", "sweep_expired_rewards"]);

export function assertAllowed(method) {
  if (!ALLOWED.has(method)) {
    throw new Error(`Sentinel cannot call ${method}. It has no authority over funds.`);
  }
}

export function plan(campaign, now) {
  const end = BigInt(campaign.campaign_end_ns || "0");
  const entryEnd = BigInt(campaign.entry_end_ns || "0");
  const claimDeadline = BigInt(campaign.claim_deadline_ns || "0");
  if (campaign.state === "EntryOpen" && now >= entryEnd) return "activate_campaign";
  if (campaign.state === "Active" && now >= end) return "finalize_campaign";
  if ((campaign.state === "FinalizedSuccess" || campaign.state === "FinalizedFailed") && claimDeadline > 0n && now >= claimDeadline) {
    return "sweep_expired_rewards";
  }
  return null;
}

async function view(rpc, contractId, method, args) {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "sentinel",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contractId,
        method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      },
    }),
  });
  const body = await response.json();
  if (body.error) throw new Error(JSON.stringify(body.error));
  return JSON.parse(Buffer.from(body.result.result).toString());
}

async function main() {
  const rpc = process.env.NEAR_RPC_URL || "https://rpc.testnet.near.org";
  const contractId = process.env.SPONSOR_CONTRACT_ID || "sponsor.diabloodevs.testnet";
  const config = await view(rpc, contractId, "get_protocol_config", {});
  const campaigns = [];
  let from = "1";
  for (let page = 0; page < 40; page += 1) {
    const batch = await view(rpc, contractId, "list_campaigns", { from_index: from, limit: "50" });
    if (!Array.isArray(batch) || batch.length === 0) break;
    campaigns.push(...batch);
    if (batch.length < 50) break;
    const last = batch[batch.length - 1]?.campaign_id;
    if (!last) break;
    from = (BigInt(last) + 1n).toString();
  }
  const now = BigInt(Date.now()) * 1_000_000n;
  const actions = [];
  for (const campaign of campaigns) {
    const method = plan(campaign, now);
    if (!method) continue;
    assertAllowed(method);
    actions.push({ campaignId: campaign.campaign_id, method });
    console.log(`${method} ${campaign.campaign_id}`);
  }
  if (actions.length === 0) console.log("No permissionless campaign action is due.");
  if (process.argv.includes("--send")) {
    console.log("Sentinel does not broadcast. Run the printed method from an operator keychain. No key is read here.");
  }
  console.log(`Watched ${contractId} on ${config.deployment_kind}. Actions ${actions.length}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
