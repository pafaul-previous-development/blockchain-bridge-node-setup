const AxiosInstance = require('./request_instance');
const HighLevelRequests = require('./high_level_requests');
const getWalletId = require('../utils/utils');
const Database = require('../database/database');
const BlockchainConfig = require('../config/blockchain_config')

class EndPointRequests {
    /**
     * 
     * @param {AxiosInstance} btcvInstance 
     * @param {AxiosInstance} gleecsInstance 
     * @param {Database} databaseInstance
     */
    constructor(btcvInstance, gleecsInstance, databaseInstance) {
        this['BTCV'] = {
            instance: btcvInstance,
            requests: new HighLevelRequests(btcvInstance)
        };
        this['GLEECS'] = {
            instance: gleecsInstance,
            requests: new HighLevelRequests(gleecsInstance)
        };
        this.database = databaseInstance;
        this.that = this;
    }

    /**
     * 
     * @param {AxiosInstance} instance 
     */
    setBtcvInstance(instance) {
        this.BTCV.instance = instance;
        this.BTCV.requests.setInstance(instance);
    }

    /**
     * 
     * @param {AxiosInstance} instance 
     */
    setGleecsInstance(instance) {
        this.GLEECS.instance = instance;
        this.GLEECS.requests.setInstance(instance);
    }

    /**
     * 
     * @param {String} currency 
     * @param {String} userId 
     * @param {String} callbackUrl 
     */
    async createWallet(currency, userId, callbackUrl) {
        let user = await this.database.safeAddUser(userId);
        let walletExists = await this.database.getKeyVaultByUid(userId, currency);
        if (!walletExists) {
            let walletId = getWalletId(currency, userId);

            let walletData = await this[currency].requests.createWallet(walletId);
            if (walletData) {
                let wallet = await this.database.safeAddKeyVaultByUid(userId, currency, walletData[1], walletId);
                if (wallet) {
                    // TODO вызов url и запись в БД
                    // await this[currency].requests.lowLevelRequests.importAddress(config[currency].watchWallet, walletData[1], '', false);
                    return await this[currency].requests.getWallet(walletId);
                }
            } else {
                throw Error('Cannot create wallet');
            }
        }
    }

    /**
     * 
     * @param {String} walletId 
     */
    async getWallet(walletId) {
        let wallet = await this.database.getKeyVaultByWalletId(walletId);
        if (wallet) {
            let walletData = await this[wallet.wallet_currency].requests.getWallet(walletData.walletId);
            return [wallet.wallet_currency, walletData, wallet.pub_key]
        }
    }

    /**
     * 
     * @param {String} userId 
     */
    async getUserWallets(userId) {
        let existingWallets = await this.database.getAllKeyVaultsByUid(userId);
        let walletInfo = [];
        for (const walletData of existingWallets) {
            let wallet = await this.getWallet(walletData.wallet_id);
            walletInfo.push(wallet);
        }
        return walletInfo;
    }

    /**
     * 
     * @param {String} walletId 
     */
    async getHistory(walletId) {
        let wallet = await this.database.getKeyVaultByWalletId(walletId);
        if (currency) {
            let walletHistory = await this[wallet.wallet_currency].requests.getHistory(wallet.wallet_id);
            return [wallet.wallet_currency, walletHistory];
        }
        return
    }

    /**
     * 
     * @param {String} userId 
     */
    async getUserHistory(userId) {
        let wallets = await this.database.getAllKeyVaultsByUserId(userId);
        let history = [];
        for (const walletData of wallets) {
            let walletHistory = await this[walletData.wallet_currency].requests.getHistory(walletData.wallet_id);
            history.push(walletHistory);
        }
        return history;
    }

    /**
     * 
     * @param {String} walletId 
     * @param {String} txId 
     */
    async getTxData(walletId, txId) {
        let wallet = await this.database.getKeyVaultByWalletId(walletId);
        if (wallet) {
            let txData = await this[wallet.wallet_currency].requests.getTxData(wallet.id, txId);
            return txData;
        }
    }

    /**
     * 
     * @param {String} currency 
     * @param {String} userId 
     * @param {String} to 
     * @param {Number} amount 
     * @param {function} callback 
     */
    async createTx(currency, userId, to, amount, callback) {
        let wallet = await this.database.getKeyVaultByUid(userId, currency);
        if (wallet) {
            let txData = await this[wallet.wallet_currency].requests.createTx(wallet.wallet_id, to, String(amount));
            if (txData) {
                if (txData.txId) {
                    // TODO вызов callback
                    return txData;
                }
                return txId;
            }
            return null;
        }
    }

    /**
     * 
     * @param {String} currency 
     * @param {String} userId 
     * @param {String} to 
     * @param {Number} amount 
     */
    async getTxComission(currency, userId, to, amount) {
        let wallet = await this.database.getKeyVaultByUid(userId, currency);
        if (wallet) {
            let confirmationBlocks = BlockchainConfig[currency].confirmationBlocks;
            let fee = await this[wallet.wallet_currency].requests.getTxComission(confirmationBlocks);
            return fee;
        }
    }
}

module.exports = EndPointRequests;