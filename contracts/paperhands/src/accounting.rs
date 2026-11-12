use near_contract_standards::fungible_token::core::FungibleTokenCore;
use near_sdk::require;

use crate::Contract;

impl Contract {
    pub(crate) fn contract_token_balance(&self) -> u128 {
        self.token
            .ft_balance_of(near_sdk::env::current_account_id())
            .0
    }

    /// Burn reserve + faucet reserve + locked principal + unclaimed mint +
    /// unclaimed survivor bonuses. There is no other reserve.
    pub(crate) fn bucket_sum(&self) -> u128 {
        self.burn_reserve
            .checked_add(self.faucet_reserve)
            .expect("bucket sum")
            .checked_add(self.locked_principal)
            .expect("bucket sum")
            .checked_add(self.unclaimed_mint_rewards)
            .expect("bucket sum")
            .checked_add(self.unclaimed_exit_bonuses)
            .expect("bucket sum")
    }

    pub(crate) fn accounting_difference(&self) -> i128 {
        let balance = i128::try_from(self.contract_token_balance()).expect("balance fits i128");
        let sum = i128::try_from(self.bucket_sum()).expect("buckets fit i128");
        balance.checked_sub(sum).expect("difference")
    }

    pub(crate) fn assert_accounting(&self) {
        require!(
            self.accounting_difference() == 0,
            "accounting invariant broken"
        );
    }
}
