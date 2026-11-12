use near_contract_standards::storage_management::{
    StorageBalance, StorageBalanceBounds, StorageManagement,
};
use near_sdk::{AccountId, NearToken, Promise, env, near, require};

use crate::{Contract, ContractExt};

impl Contract {
    /// Keep the attached NEAR that pays for bytes written in this call and
    /// refund the rest. Requires at least 1 yoctoNEAR so a function-call
    /// access key cannot move tokens.
    pub(crate) fn settle_storage_payment(&mut self, storage_before: u64) {
        // `store::LookupMap` writes on flush. Measure after the new keys exist,
        // which is what the runtime charges once the call commits.
        self.epochs.flush();
        self.commitments.flush();
        let used = u128::from(env::storage_usage().saturating_sub(storage_before));
        let cost = env::storage_byte_cost().saturating_mul(used);
        let attached = env::attached_deposit();
        require!(
            attached >= NearToken::from_yoctonear(1),
            "attach at least 1 yoctoNEAR"
        );
        let message = format!(
            "insufficient storage deposit: attached {} yoctoNEAR, storage requires {} yoctoNEAR",
            attached.as_yoctonear(),
            cost.as_yoctonear()
        );
        require!(attached >= cost, message);
        let refund = attached.saturating_sub(cost);
        if refund > NearToken::from_yoctonear(0) {
            Promise::new(env::predecessor_account_id())
                .transfer(refund)
                .detach();
        }
    }
}

#[near]
impl StorageManagement for Contract {
    #[payable]
    fn storage_deposit(
        &mut self,
        account_id: Option<AccountId>,
        registration_only: Option<bool>,
    ) -> StorageBalance {
        let balance = self.token.storage_deposit(account_id, registration_only);
        self.assert_accounting();
        balance
    }

    #[payable]
    fn storage_withdraw(&mut self, amount: Option<NearToken>) -> StorageBalance {
        let balance = self.token.storage_withdraw(amount);
        self.assert_accounting();
        balance
    }

    #[payable]
    fn storage_unregister(&mut self, force: Option<bool>) -> bool {
        let removed = self.token.internal_storage_unregister(force).is_some();
        self.assert_accounting();
        removed
    }

    fn storage_balance_bounds(&self) -> StorageBalanceBounds {
        self.token.storage_balance_bounds()
    }

    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance> {
        self.token.storage_balance_of(account_id)
    }
}
