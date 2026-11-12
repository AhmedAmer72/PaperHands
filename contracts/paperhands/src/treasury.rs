use near_sdk::{env, near, require};

use crate::config::FAUCET_AMOUNT;
use crate::events;
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    /// Demo deployments only. Pays 1,000 PAPER once per account from the
    /// faucet reserve. Does not mint. Not Sybil-proof: a new Testnet account
    /// is a new claim.
    #[payable]
    pub fn claim_testnet_faucet(&mut self) {
        let before = env::storage_usage();
        require!(
            self.config.faucet_enabled,
            "faucet is disabled on this deployment"
        );
        let account = env::predecessor_account_id();
        let message = "faucet already claimed for this account";
        require!(!self.faucet_claims.contains(&account), message);
        require!(
            self.faucet_reserve >= FAUCET_AMOUNT,
            "faucet reserve is exhausted"
        );
        self.assert_registered(&account);
        self.faucet_reserve -= FAUCET_AMOUNT;
        let inserted = self.faucet_claims.insert(account.clone());
        require!(inserted, message);
        let contract_id = env::current_account_id();
        self.transfer_internal(&contract_id, &account, FAUCET_AMOUNT, "testnet faucet");
        events::faucet_claimed(&account, FAUCET_AMOUNT, self.faucet_reserve);
        self.assert_accounting();
        self.settle_storage_payment(before);
    }
}
