# Economic invariants

After every state-changing method:

```text
supply = initial
       + graded mints
       - failed-epoch reserve burns
       - early-exit burns
       - swept unclaimed reward burns
       - bonus dust burns
```

Transfers, locks, entry refunds, and survivor bonuses move balances. They do not change supply. `accounting_difference` is the gap between `ft_total_supply` and that formula plus any forced NEP-145 burn. A healthy contract returns `"0"`.

`storage_unregister(force = true)` burns the account's liquid PAPER. That supply change is not one of the protocol buckets. The unit test `storage_unregister_force_burn_stays_accounted` checks that the difference stays `"0"` and that the protocol formula is not applied on top of that burn.

## Dust

`bonus_per = pool / survivors`, and `distributable = bonus_per * survivors`. The contract burns `pool - distributable`. A 250 PAPER pool across 30 survivors leaves 10 smallest units. Those 10 units are burned. The same rule burns a 1 unit remainder when 25 PAPER is split across 3 survivors.

## Scenario B, published supply

The 60-day Balanced scenario is a simulation. It is not Testnet activity.

The published scenario is five success epochs (40 entered, 8 exited, 32 stayed, mint 320 PAPER) and three failure epochs (40 entered, 10 exited, 30 stayed, mint 300 PAPER, reserve burn 250 PAPER). The published exit burn is `10 * 25 * 3 = 750` PAPER. Each failure epoch's 250 PAPER bonus divided by 30 leaves a remainder of 10 units. The published supply subtracts that remainder once:

```text
1,000,000 + 2,500 - 750 - 750 - 0.00000010 = 1,000,999.99999990 PAPER
```

`formatPaper` prints `1000999.99999990`. The simulator test locks that string. The dust burn is not dropped.

A formula-true sum of the same eight epochs is a different number. The five success epochs also exit-burn `5 * 8 * 25 = 1,000` PAPER, and three failure epochs burn `3 * 10 = 30` units of dust. That supply is `999,999.99999970` PAPER. The published table does not use that sum. `docs/ECONOMIC_INVARIANTS.md` is the place that difference is written down. Each epoch record in the simulator still stores the formula's own exit burn and its own remainder. The contract burns the remainder on every epoch. The published headline subtracts 10 units once and does not include the success-epoch exit burns.

Scenarios A and C match the spec totals with no remainder: Diamond ends at 1,004,000 PAPER, Paperhands at 995,800 PAPER.
