// Policy checks for a future Chain Signatures pilot. This module cannot sign.

export function evaluate(request, policy, now) {
  if (!policy.chains.includes(request.chain)) return { ok: false, reason: "chain is not allowlisted" };
  if (!policy.destinations.includes(request.destination)) return { ok: false, reason: "destination is not allowlisted" };
  if (!policy.assets.includes(request.asset)) return { ok: false, reason: "asset is not allowlisted" };
  if (request.amount <= 0n || request.amount > policy.maxAmount) return { ok: false, reason: "amount is outside the cap" };
  if (request.expiry <= now) return { ok: false, reason: "request is expired" };
  if (policy.usedNonces.has(request.nonce)) return { ok: false, reason: "nonce was already used" };
  return { ok: true, reason: "policy allows the request" };
}

export function sign() {
  throw new Error("This module cannot sign. Chain Signatures are not connected.");
}
