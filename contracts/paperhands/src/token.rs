use near_contract_standards::fungible_token::core::FungibleTokenCore;
use near_contract_standards::fungible_token::events::{FtBurn, FtMint};
use near_contract_standards::fungible_token::metadata::{
    FT_METADATA_SPEC, FungibleTokenMetadata, FungibleTokenMetadataProvider,
};
use near_contract_standards::fungible_token::resolver::FungibleTokenResolver;
use near_contract_standards::storage_management::StorageManagement;
use near_sdk::json_types::U128;
use near_sdk::{AccountId, PromiseOrValue, env, near, require};

use crate::{Contract, ContractExt};

impl Contract {
    pub(crate) fn assert_registered(&self, account: &AccountId) {
        require!(
            StorageManagement::storage_balance_of(&self.token, account.clone()).is_some(),
            "account is not registered; call storage_deposit before moving PAPER",
        );
    }

    pub(crate) fn mint_to_contract(&mut self, amount: u128, memo: &str) {
        if amount == 0 {
            return;
        }
        let id = env::current_account_id();
        self.token.internal_deposit(&id, amount);
        FtMint {
            owner_id: &id,
            amount: U128(amount),
            memo: Some(memo),
        }
        .emit();
    }

    pub(crate) fn burn_from_contract(&mut self, amount: u128, memo: &str) {
        if amount == 0 {
            return;
        }
        let id = env::current_account_id();
        self.token.internal_withdraw(&id, amount);
        FtBurn {
            owner_id: &id,
            amount: U128(amount),
            memo: Some(memo),
        }
        .emit();
    }

    pub(crate) fn transfer_internal(
        &mut self,
        from: &AccountId,
        to: &AccountId,
        amount: u128,
        memo: &str,
    ) {
        self.token
            .internal_transfer(from, to, amount, Some(memo.to_string()));
    }

    fn reject_contract_receiver(&self, receiver: &AccountId) {
        require!(
            receiver != &env::current_account_id(),
            "transfers to the PAPERHANDS contract are rejected; lock tokens with join_epoch",
        );
    }
}

#[near]
impl FungibleTokenCore for Contract {
    #[payable]
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>) {
        self.reject_contract_receiver(&receiver_id);
        self.token.ft_transfer(receiver_id, amount, memo);
        self.assert_accounting();
    }

    #[payable]
    fn ft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<U128> {
        self.reject_contract_receiver(&receiver_id);
        let result = self.token.ft_transfer_call(receiver_id, amount, memo, msg);
        self.assert_accounting();
        result
    }

    fn ft_total_supply(&self) -> U128 {
        self.token.ft_total_supply()
    }

    fn ft_balance_of(&self, account_id: AccountId) -> U128 {
        self.token.ft_balance_of(account_id)
    }
}

#[near]
impl FungibleTokenResolver for Contract {
    #[private]
    fn ft_resolve_transfer(
        &mut self,
        sender_id: AccountId,
        receiver_id: AccountId,
        amount: U128,
    ) -> U128 {
        let (used, burned) =
            self.token
                .internal_ft_resolve_transfer(&sender_id, receiver_id, amount);
        if burned > 0 {
            near_sdk::log!(
                "ft_resolve_transfer burned {} because the sender was no longer registered",
                burned
            );
        }
        self.assert_accounting();
        used.into()
    }
}

#[near]
impl FungibleTokenMetadataProvider for Contract {
    fn ft_metadata(&self) -> FungibleTokenMetadata {
        require!(
            self.config.spec == FT_METADATA_SPEC,
            "metadata spec drifted"
        );
        FungibleTokenMetadata {
            spec: self.config.spec.clone(),
            name: self.config.name.clone(),
            symbol: self.config.symbol.clone(),
            icon: None,
            reference: None,
            reference_hash: None,
            decimals: self.config.decimals,
        }
    }
}
