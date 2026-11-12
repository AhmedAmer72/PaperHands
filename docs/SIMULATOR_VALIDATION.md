# Simulator validation

The simulator lives in `simulator/`. It is TypeScript integer math. It does not call NEAR. Every scenario object sets `simulation: true`. The lab page is labeled SIMULATION and is not Testnet history.

`npm test` on 11 Nov 2026: 5 passed, 0 failed.

The formulas match the contract helpers: retention `survivors * 100 >= original * 80`, mint `min(survivors * 1,000 PAPER * 1%, 500 PAPER)` then floor per survivor, failed-epoch burn 250 PAPER, early-exit burn 25 and bonus 25 per exit, and bonus dust burned.

## Diamond

Eight successful epochs. 50 original, 50 survivors, no exits.

- Mint 4,000 PAPER
- Reserve burn 0
- Exit burn 0
- Supply 1,004,000 PAPER
- Current streak 8
- Longest streak 8
- Days 60, with the ninth epoch still pending for the last four days

## Balanced

Five epochs of 40 original and 32 survivors, then three epochs of 40 original and 30 survivors with 10 exits.

- Mint 2,500 PAPER
- Reserve burn 750 PAPER
- Exit burn 750 PAPER
- Bonus dust 10 raw units
- Supply `1,000,999.99999990` PAPER
- Current streak 0
- Longest streak 5

The brief's rounded total of `1,001,000` drops those 10 units. The contract burns them. The simulator keeps the burn. That is the verified number.

## Paperhands

Eight failed epochs. 25 original, 10 survivors, 15 exits.

- Mint 800 PAPER
- Reserve burn 2,000 PAPER
- Exit burn 3,000 PAPER
- Supply 995,800 PAPER
- Current streak 0
- Longest streak 0

The same input produces the same output. The tests assert the figures above.
