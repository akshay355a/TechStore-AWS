'use strict';

const { getPool } = require('./config/database');
const logger = require('./config/logger');

function handleQueryError(operation, error) {
    logger.error(`Transaction database operation failed: ${operation}`, { error });
    throw error;
}

function addTransaction(amount, desc) {
    getPool().query(
        'INSERT INTO transactions (amount, description) VALUES (?, ?)',
        [amount, desc],
        error => {
            if (error) return handleQueryError('add transaction', error);
            logger.info('Transaction added');
        }
    );
    return 200;
}

function getAllTransactions(callback) {
    getPool().query('SELECT * FROM transactions', (error, result) => {
        if (error) return handleQueryError('get all transactions', error);
        logger.info('Transactions retrieved');
        return callback(result);
    });
}

function findTransactionById(id, callback) {
    getPool().query('SELECT * FROM transactions WHERE id = ?', [id], (error, result) => {
        if (error) return handleQueryError('find transaction by ID', error);
        logger.info('Transaction retrieved', { transactionId: id });
        return callback(result);
    });
}

function deleteAllTransactions(callback) {
    getPool().query('DELETE FROM transactions', (error, result) => {
        if (error) return handleQueryError('delete all transactions', error);
        logger.info('Transactions deleted');
        return callback(result);
    });
}

function deleteTransactionById(id, callback) {
    getPool().query('DELETE FROM transactions WHERE id = ?', [id], (error, result) => {
        if (error) return handleQueryError('delete transaction by ID', error);
        logger.info('Transaction deleted', { transactionId: id });
        return callback(result);
    });
}

module.exports = {
    addTransaction,
    getAllTransactions,
    deleteAllTransactions,
    findTransactionById,
    deleteTransactionById
};
