// NEAR Intents is not connected. This module cannot record a join or a claim.

export function quoteStatus() {
  return {
    connected: false,
    reason: "NEAR Intents is not connected. A quote is not a join. SponsorHub records a join only after PAPER arrives.",
  };
}

export function recordJoinFromQuote() {
  throw new Error("A Sponsor join is recorded only after PAPER arrives on SponsorHub. An Intents quote cannot create one.");
}
