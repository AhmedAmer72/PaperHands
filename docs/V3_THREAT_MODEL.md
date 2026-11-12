# PAPERHANDS V3 threat model

SponsorHub, MissionHub, and Treasury do not share a balance with Diamond Core or with each other. A bug in one contract does not move Core reserves.

| Threat | What the contracts do |
| --- | --- |
| Sponsor withdraws after people join | Cancel is refused once `join_count` is above zero. Terms have no setter. |
| Reward promised above the deposit | A campaign stays in `Draft` until the exact reward arrives. |
| Fake PAPER token | `ft_on_transfer` requires the predecessor to be the configured PAPER account. |
| Direct `ft_on_transfer` call | The same predecessor check rejects it. |
| Second claim | A pending or claimed flag blocks another pull of that liability. |
| Failed token transfer | The callback restores the liability. Sweep does not reduce principal. |
| One campaign spending another | Each campaign has its own ledger, checked after every change. |
| Rounding | Integer division. The remainder has one destination: sponsor refund, or the protocol reserve for bonus dust. |
| Many accounts, one person | One position per account. The product still says this is not Sybil-proof. |
| Pause used to seize funds | Pause blocks new joins, new campaigns, new mission intake, and new treasury approvals. It does not move a balance. |
| Reviewer takes the mission budget | Refund requires the sponsor, and create refuses a sponsor who is also the reviewer. |
| One treasury key | The executor cannot be an approver. One approval cannot execute. Execution waits for the timelock. |
| Agent or quote moves money | Sentinel rejects every method except three permissionless calls and does not hold a key. Intents and Chain Signatures throw instead of settling or signing. |
| Full-access key on Core | Still present. Core can still be replaced until that key is removed. V3 does not remove it. |

Before any material Mainnet balance, these contracts still need an independent review. Unit tests and one sandbox run are not that review.
