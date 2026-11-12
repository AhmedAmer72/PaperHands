# Testnet accounts

Network: NEAR Testnet. Contract: `diabloodevs.testnet`.

Twenty-five accounts were created with the public Testnet faucet (`sponsor-by-faucet-service`). Each received about 10 Testnet NEAR from that faucet. Their signing keys are stored outside the repository, under the local near-cli credential directory. No private key is in this file or in git.

The contract account `diabloodevs.testnet` was not used as a participant. It still holds the protocol reserves.

Creation of the first account: [9HfJExyQHis6GXhYC74pnneoG4sNAipUze6ZTgvgH4fm](https://explorer.testnet.near.org/transactions/9HfJExyQHis6GXhYC74pnneoG4sNAipUze6ZTgvgH4fm).

After every account below registered storage and claimed the faucet once:

- `ft_total_supply` stayed `100000000000000`. The faucet transfers. It does not mint.
- `faucet_reserve` fell from `70000000000000` to `67500000000000` (25,000 PAPER).
- `burn_reserve` stayed `30000000000000`.
- `accounting_difference` stayed `0`.
- `paperhandsph00.testnet` balance is `100000000000` (1,000 PAPER).
- A second claim by that account failed. Transaction [CN5teQ5uPFf7WNdnhHXbzYkiBAYGiyX8TfW9G6qb5AHi](https://explorer.testnet.near.org/transactions/CN5teQ5uPFf7WNdnhHXbzYkiBAYGiyX8TfW9G6qb5AHi) panicked with `faucet already claimed for this account`.

| Account | NEAR | PAPER after faucet | Storage |
| --- | --- | --- | --- |
| `paperhandsph00.testnet` through `paperhandsph24.testnet` | about 10 each, from the Testnet faucet | 1,000 PAPER | registered |

## Transactions

| Account | Step | Status | Transaction |
| --- | --- | --- | --- |
| `paperhandsph00.testnet` | `storage_deposit` | ok | [BTjybGwWoQgN4oJjQaX83j2wAxLj1ws7tuJDrVUzATf5](https://explorer.testnet.near.org/transactions/BTjybGwWoQgN4oJjQaX83j2wAxLj1ws7tuJDrVUzATf5) |
| `paperhandsph00.testnet` | `claim_testnet_faucet` | ok | [7i6bwoQDzkKAkzKWA4tsjegCUuq6RqXecAWXbTXDs2rs](https://explorer.testnet.near.org/transactions/7i6bwoQDzkKAkzKWA4tsjegCUuq6RqXecAWXbTXDs2rs) |
| `paperhandsph01.testnet` | `storage_deposit` | ok | [8PLdHh9EEJaqAp62D7jJ8zebCPyRZKUKnCW7fPdzoc9F](https://explorer.testnet.near.org/transactions/8PLdHh9EEJaqAp62D7jJ8zebCPyRZKUKnCW7fPdzoc9F) |
| `paperhandsph01.testnet` | `claim_testnet_faucet` | ok | [DKqyVmoC9P5jggetTSQgGRrmA6Qn9ExXbWDVTEhJbFa5](https://explorer.testnet.near.org/transactions/DKqyVmoC9P5jggetTSQgGRrmA6Qn9ExXbWDVTEhJbFa5) |
| `paperhandsph02.testnet` | `storage_deposit` | ok | [5ze36bFUQeEPvGhmYZ3tnmqYW1sySrb2rTwHiwZMsk6s](https://explorer.testnet.near.org/transactions/5ze36bFUQeEPvGhmYZ3tnmqYW1sySrb2rTwHiwZMsk6s) |
| `paperhandsph02.testnet` | `claim_testnet_faucet` | ok | [313sSmas4QHwSzYFfzrVS4yKu8zyNdWQUL1K5RyrQYw5](https://explorer.testnet.near.org/transactions/313sSmas4QHwSzYFfzrVS4yKu8zyNdWQUL1K5RyrQYw5) |
| `paperhandsph03.testnet` | `storage_deposit` | ok | [Ad4py56PHansgKjPiSKTH5rvJ9eeWfQRata6ZKTT3L4h](https://explorer.testnet.near.org/transactions/Ad4py56PHansgKjPiSKTH5rvJ9eeWfQRata6ZKTT3L4h) |
| `paperhandsph03.testnet` | `claim_testnet_faucet` | ok | [2GsCDyWkisK62aQp4A7Rvc4f9bgRGW27M8ayLh7hJMZc](https://explorer.testnet.near.org/transactions/2GsCDyWkisK62aQp4A7Rvc4f9bgRGW27M8ayLh7hJMZc) |
| `paperhandsph04.testnet` | `storage_deposit` | ok | [JD5R2K7Po3c2pUtJ3EnKbMGbQbF5F7K1UHRXTVdkgCWU](https://explorer.testnet.near.org/transactions/JD5R2K7Po3c2pUtJ3EnKbMGbQbF5F7K1UHRXTVdkgCWU) |
| `paperhandsph04.testnet` | `claim_testnet_faucet` | ok | [4ipvMSsMJ4KAeWWn4H5Ur2BwSyecmSsE3xe25kxYwhHH](https://explorer.testnet.near.org/transactions/4ipvMSsMJ4KAeWWn4H5Ur2BwSyecmSsE3xe25kxYwhHH) |
| `paperhandsph05.testnet` | `storage_deposit` | ok | [8ALvF9uDLmKoeMRG7CUme87rtz8H9Qa9E3AypgCxu3aG](https://explorer.testnet.near.org/transactions/8ALvF9uDLmKoeMRG7CUme87rtz8H9Qa9E3AypgCxu3aG) |
| `paperhandsph05.testnet` | `claim_testnet_faucet` | ok | [DBa7pJ6X796nSq6rPwHJBoSv8sHwsu496zKsJQuCauo6](https://explorer.testnet.near.org/transactions/DBa7pJ6X796nSq6rPwHJBoSv8sHwsu496zKsJQuCauo6) |
| `paperhandsph06.testnet` | `storage_deposit` | ok | [FcXqw3te1hA3u7bowCXLor4Gy2uTYWBWN2cEbyAJpUPm](https://explorer.testnet.near.org/transactions/FcXqw3te1hA3u7bowCXLor4Gy2uTYWBWN2cEbyAJpUPm) |
| `paperhandsph06.testnet` | `claim_testnet_faucet` | ok | [9niy3uW7QwMKg1cXUNq4rihZBS9TTeeCsBQCUULmQydX](https://explorer.testnet.near.org/transactions/9niy3uW7QwMKg1cXUNq4rihZBS9TTeeCsBQCUULmQydX) |
| `paperhandsph07.testnet` | `storage_deposit` | ok | [HDu83TauUXr32W9cRx59ACFwM4EimuRoHjwT36U4NG52](https://explorer.testnet.near.org/transactions/HDu83TauUXr32W9cRx59ACFwM4EimuRoHjwT36U4NG52) |
| `paperhandsph07.testnet` | `claim_testnet_faucet` | ok | [5XQ9u2gr3SrPGNAkEqVJVCzYZyWHmiPUYVqp7xEJiket](https://explorer.testnet.near.org/transactions/5XQ9u2gr3SrPGNAkEqVJVCzYZyWHmiPUYVqp7xEJiket) |
| `paperhandsph08.testnet` | `storage_deposit` | ok | [Cx2BQCmgw2hCrJ8Shn7S4326gQj5XN6q1AXHB6nuproW](https://explorer.testnet.near.org/transactions/Cx2BQCmgw2hCrJ8Shn7S4326gQj5XN6q1AXHB6nuproW) |
| `paperhandsph08.testnet` | `claim_testnet_faucet` | ok | [Acc79k2rqCR5AUfUDiEX5QDWuguBqBq7ASBdnwKFaiWw](https://explorer.testnet.near.org/transactions/Acc79k2rqCR5AUfUDiEX5QDWuguBqBq7ASBdnwKFaiWw) |
| `paperhandsph09.testnet` | `storage_deposit` | ok | [59j1Z9HcKGhBtfsLpZFTQ2Wb6kAoE8c7T78QsjmVuKxm](https://explorer.testnet.near.org/transactions/59j1Z9HcKGhBtfsLpZFTQ2Wb6kAoE8c7T78QsjmVuKxm) |
| `paperhandsph09.testnet` | `claim_testnet_faucet` | ok | [3Vhhw6hfmPx5uSMLokkTLqJtEkPTLTCtfSvZpyd8ubWo](https://explorer.testnet.near.org/transactions/3Vhhw6hfmPx5uSMLokkTLqJtEkPTLTCtfSvZpyd8ubWo) |
| `paperhandsph10.testnet` | `storage_deposit` | ok | [HS4ec9om1Kvf32LrRb7ZjqreFn1j9Qj6YrsBjRWBXXqw](https://explorer.testnet.near.org/transactions/HS4ec9om1Kvf32LrRb7ZjqreFn1j9Qj6YrsBjRWBXXqw) |
| `paperhandsph10.testnet` | `claim_testnet_faucet` | ok | [3ehvQjJnmCFiChGvUPqgtNajsyDqVQTqBvyTRbBHEwtD](https://explorer.testnet.near.org/transactions/3ehvQjJnmCFiChGvUPqgtNajsyDqVQTqBvyTRbBHEwtD) |
| `paperhandsph11.testnet` | `storage_deposit` | ok | [4TiA2YTBbCHJigNkpFAX4TpCKCKstei9uArYH65QMyc2](https://explorer.testnet.near.org/transactions/4TiA2YTBbCHJigNkpFAX4TpCKCKstei9uArYH65QMyc2) |
| `paperhandsph11.testnet` | `claim_testnet_faucet` | ok | [DgiH2LmLA4DvyK7CtDxgqCfDPj7zjJGcmd6BhwQV7Wjk](https://explorer.testnet.near.org/transactions/DgiH2LmLA4DvyK7CtDxgqCfDPj7zjJGcmd6BhwQV7Wjk) |
| `paperhandsph12.testnet` | `storage_deposit` | ok | [CZe99ECthbtMwmxreJDT6Y6UJXqBD8gw6QWfEKd2gxTc](https://explorer.testnet.near.org/transactions/CZe99ECthbtMwmxreJDT6Y6UJXqBD8gw6QWfEKd2gxTc) |
| `paperhandsph12.testnet` | `claim_testnet_faucet` | ok | [Dy8nKRLBFLYTZCZv8R6A5aCEG98C2vrvsBDLAUsUs5Z2](https://explorer.testnet.near.org/transactions/Dy8nKRLBFLYTZCZv8R6A5aCEG98C2vrvsBDLAUsUs5Z2) |
| `paperhandsph13.testnet` | `storage_deposit` | ok | [FyBYbRb838Y5R4a8SaKUvg7Bz3fpVbpz6qeZVxTkU5XJ](https://explorer.testnet.near.org/transactions/FyBYbRb838Y5R4a8SaKUvg7Bz3fpVbpz6qeZVxTkU5XJ) |
| `paperhandsph13.testnet` | `claim_testnet_faucet` | ok | [6Y4tSxSzxVgHDHq7W7y3j47JFJXK2QF98fUFdvgY3wd9](https://explorer.testnet.near.org/transactions/6Y4tSxSzxVgHDHq7W7y3j47JFJXK2QF98fUFdvgY3wd9) |
| `paperhandsph14.testnet` | `storage_deposit` | ok | [tdQLi8mfEYaAfCKfbRaw6CknovNKG56Dsze2WjzrooV](https://explorer.testnet.near.org/transactions/tdQLi8mfEYaAfCKfbRaw6CknovNKG56Dsze2WjzrooV) |
| `paperhandsph14.testnet` | `claim_testnet_faucet` | ok | [88EMfPEMV5LG2ZJfPfe1z49UYXb8TGksH9g5m8mzgpP1](https://explorer.testnet.near.org/transactions/88EMfPEMV5LG2ZJfPfe1z49UYXb8TGksH9g5m8mzgpP1) |
| `paperhandsph15.testnet` | `storage_deposit` | ok | [6BiCca9SYNS8uGpjCrE73Da4kpz7wNbtx56m7VNzjq28](https://explorer.testnet.near.org/transactions/6BiCca9SYNS8uGpjCrE73Da4kpz7wNbtx56m7VNzjq28) |
| `paperhandsph15.testnet` | `claim_testnet_faucet` | ok | [BhNPEdGME2VjTTeXZmHLDWiYHgAhscLheCzTNDSv6XVG](https://explorer.testnet.near.org/transactions/BhNPEdGME2VjTTeXZmHLDWiYHgAhscLheCzTNDSv6XVG) |
| `paperhandsph16.testnet` | `storage_deposit` | ok | [Uf4adS48oyPGHeaC7ngTcU75qm74FRiRV9ub5ei5MFr](https://explorer.testnet.near.org/transactions/Uf4adS48oyPGHeaC7ngTcU75qm74FRiRV9ub5ei5MFr) |
| `paperhandsph16.testnet` | `claim_testnet_faucet` | ok | [7WVgzCaYbpPFadub6CVcN8dQCJ4J14bYh5HWLAcfRbwV](https://explorer.testnet.near.org/transactions/7WVgzCaYbpPFadub6CVcN8dQCJ4J14bYh5HWLAcfRbwV) |
| `paperhandsph17.testnet` | `storage_deposit` | ok | [JaexbE2GJ3h7VDiWcC3TksDXTNL2kzKLfndHYrTF2ox](https://explorer.testnet.near.org/transactions/JaexbE2GJ3h7VDiWcC3TksDXTNL2kzKLfndHYrTF2ox) |
| `paperhandsph17.testnet` | `claim_testnet_faucet` | ok | [FnceEKP1i4uPWVwPbf4UStXdWn6rmiMAgFSyMMTZz9df](https://explorer.testnet.near.org/transactions/FnceEKP1i4uPWVwPbf4UStXdWn6rmiMAgFSyMMTZz9df) |
| `paperhandsph18.testnet` | `storage_deposit` | ok | [CmxpYbKjwg3ujcRNqbgkvwj8iS3josuq3CkPaY7f345j](https://explorer.testnet.near.org/transactions/CmxpYbKjwg3ujcRNqbgkvwj8iS3josuq3CkPaY7f345j) |
| `paperhandsph18.testnet` | `claim_testnet_faucet` | ok | [FN5w2Zq1koZeDLdmhpiGWqjfeTM8721G9foNPdf1jju8](https://explorer.testnet.near.org/transactions/FN5w2Zq1koZeDLdmhpiGWqjfeTM8721G9foNPdf1jju8) |
| `paperhandsph19.testnet` | `storage_deposit` | ok | [AjR4dY1TtWEWj8bbQRNtpdMCx4QN2qP5Q7TKa9nU3nC](https://explorer.testnet.near.org/transactions/AjR4dY1TtWEWj8bbQRNtpdMCx4QN2qP5Q7TKa9nU3nC) |
| `paperhandsph19.testnet` | `claim_testnet_faucet` | ok | [2EyLe5mN2caWi96jyy4LsAFKswWFdbi6bmWGH82rbXzH](https://explorer.testnet.near.org/transactions/2EyLe5mN2caWi96jyy4LsAFKswWFdbi6bmWGH82rbXzH) |
| `paperhandsph20.testnet` | `storage_deposit` | ok | [9d83aAEsffpVVYsmCFwnSFvMpXKLhD3eWAzdgM51AXf9](https://explorer.testnet.near.org/transactions/9d83aAEsffpVVYsmCFwnSFvMpXKLhD3eWAzdgM51AXf9) |
| `paperhandsph20.testnet` | `claim_testnet_faucet` | ok | [4Qime9DRqYQsAnyo2nNdzNDZZB9cF9jMTxfZYiD8pQHP](https://explorer.testnet.near.org/transactions/4Qime9DRqYQsAnyo2nNdzNDZZB9cF9jMTxfZYiD8pQHP) |
| `paperhandsph21.testnet` | `storage_deposit` | ok | [7V4u9i7n78mnVw3Uqv6uLn119ucBdMMMit8vzLpBnyBU](https://explorer.testnet.near.org/transactions/7V4u9i7n78mnVw3Uqv6uLn119ucBdMMMit8vzLpBnyBU) |
| `paperhandsph21.testnet` | `claim_testnet_faucet` | ok | [9tJNbPMcJc36FDEh1ziKjq6THDLNFpMEx6nQyFWQ1c37](https://explorer.testnet.near.org/transactions/9tJNbPMcJc36FDEh1ziKjq6THDLNFpMEx6nQyFWQ1c37) |
| `paperhandsph22.testnet` | `storage_deposit` | ok | [FZmBaR7BDG3dj8moMyEpwzktP4dGX8G3zg99mgoPtahE](https://explorer.testnet.near.org/transactions/FZmBaR7BDG3dj8moMyEpwzktP4dGX8G3zg99mgoPtahE) |
| `paperhandsph22.testnet` | `claim_testnet_faucet` | ok | [GVWEJm9MxbokHTdzD364ydvt8wymxV6kBdh3Safxfddy](https://explorer.testnet.near.org/transactions/GVWEJm9MxbokHTdzD364ydvt8wymxV6kBdh3Safxfddy) |
| `paperhandsph23.testnet` | `storage_deposit` | ok | [CWiRh1BbacDbuKgvHwjLN1etNxM87wa66o6zipyjLqBA](https://explorer.testnet.near.org/transactions/CWiRh1BbacDbuKgvHwjLN1etNxM87wa66o6zipyjLqBA) |
| `paperhandsph23.testnet` | `claim_testnet_faucet` | ok | [FbJai2HXDF91TnXo1kgJLTg4tf1QS68ZCKAeKh65bizY](https://explorer.testnet.near.org/transactions/FbJai2HXDF91TnXo1kgJLTg4tf1QS68ZCKAeKh65bizY) |
| `paperhandsph24.testnet` | `storage_deposit` | ok | [HPYtNeMmq1WZFtnYenehWTFkQhsmgdcoDgWvLamb3R4U](https://explorer.testnet.near.org/transactions/HPYtNeMmq1WZFtnYenehWTFkQhsmgdcoDgWvLamb3R4U) |
| `paperhandsph24.testnet` | `claim_testnet_faucet` | ok | [8CZWeiwab1ySvLrqtTRQpHMNLQiub3JKt98yVxpjzvFZ](https://explorer.testnet.near.org/transactions/8CZWeiwab1ySvLrqtTRQpHMNLQiub3JKt98yVxpjzvFZ) |

