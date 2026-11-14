import { pathToFileURL } from "node:url";

// Compare SponsorHub views with the ledger invariant. This script never signs.

async function view(rpc, contractId, method, args) {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "reconcile",
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

export function difference(books) {
  const assets = BigInt(books.assets);
  const liabilities = BigInt(books.principal_liability)
    + BigInt(books.sponsor_reward_liability)
    + BigInt(books.survivor_bonus_liability)
    + BigInt(books.protocol_reserve)
    + BigInt(books.refund_liability);
  return assets - liabilities;
}

async function listAll(rpc, contractId, method, idKey) {
  const rows = [];
  let from = 1;
  for (let page = 0; page < 40; page += 1) {
    const chunk = await view(rpc, contractId, method, { from_index: String(from), limit: "50" });
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    rows.push(...chunk);
    const last = Number(chunk[chunk.length - 1][idKey]);
    if (!Number.isFinite(last) || chunk.length < 50) break;
    from = last + 1;
  }
  return rows;
}

async function main() {
  const rpc = process.env.NEAR_RPC_URL || "https://rpc.testnet.near.org";
  const contractId = process.env.SPONSOR_CONTRACT_ID || "sponsor.diabloodevs.testnet";
  const config = await view(rpc, contractId, "get_protocol_config", {});
  const campaigns = await listAll(rpc, contractId, "list_campaigns", "campaign_id");
  const rows = [];
  for (const campaign of campaigns) {
    const books = await view(rpc, contractId, "get_campaign_accounting", { campaign_id: campaign.campaign_id });
    const delta = difference(books);
    rows.push({ campaignId: campaign.campaign_id, difference: delta.toString(), contractDifference: books.accounting_difference });
    if (delta !== 0n || books.accounting_difference !== "0") {
      throw new Error(`Campaign ${campaign.campaign_id} does not reconcile.`);
    }
  }
  console.log(JSON.stringify({ contractId, deploymentKind: config.deployment_kind, campaigns: rows }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
