const dbcreds = require('./DbConfig');
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');

// Determine if we should use local mock DB (if host is empty or a placeholder)
const useMock = !dbcreds.DB_HOST || dbcreds.DB_HOST.includes('<') || dbcreds.DB_HOST.trim() === '';

const dbFile = path.join(__dirname, 'transactions.json');

function readMockData() {
    if (!fs.existsSync(dbFile)) {
        fs.writeFileSync(dbFile, JSON.stringify([]));
    }
    try {
        const raw = fs.readFileSync(dbFile, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function writeMockData(data) {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

let con;
if (!useMock) {
    con = mysql.createConnection({
        host: dbcreds.DB_HOST,
        user: dbcreds.DB_USER,
        password: dbcreds.DB_PWD,
        database: dbcreds.DB_DATABASE
    });
} else {
    console.log("--------------------------------------------------------------------------------");
    console.log("WARNING: MySQL credentials not configured in DbConfig.js.");
    console.log("STORAGE: Falling back to local JSON database (transactions.json) for development.");
    console.log("--------------------------------------------------------------------------------");
}

function addTransaction(amount, desc) {
    if (useMock) {
        const data = readMockData();
        const nextId = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
        data.push({ id: nextId, amount: parseFloat(amount) || 0, description: desc });
        writeMockData(data);
        console.log("Adding to the local mock table worked");
        return 200;
    }

    var mysqlQuery = `INSERT INTO \`transactions\` (\`amount\`, \`description\`) VALUES ('${amount}','${desc}')`;
    con.query(mysqlQuery, function(err, result) {
        if (err) throw err;
        console.log("Adding to the table should have worked");
    });
    return 200;
}

function getAllTransactions(callback) {
    if (useMock) {
        const data = readMockData();
        console.log("Getting all transactions from local mock...");
        return callback(data);
    }

    var mysqlQuery = "SELECT * FROM transactions";
    con.query(mysqlQuery, function(err, result) {
        if (err) throw err;
        console.log("Getting all transactions...");
        return callback(result);
    });
}

function findTransactionById(id, callback) {
    if (useMock) {
        const data = readMockData();
        const result = data.filter(item => item.id == id);
        console.log(`retrieving transactions with id ${id} from local mock`);
        return callback(result);
    }

    var mysqlQuery = `SELECT * FROM transactions WHERE id = ${id}`;
    con.query(mysqlQuery, function(err, result) {
        if (err) throw err;
        console.log(`retrieving transactions with id ${id}`);
        return callback(result);
    });
}

function deleteAllTransactions(callback) {
    if (useMock) {
        writeMockData([]);
        console.log("Deleting all transactions from local mock...");
        return callback([]);
    }

    var mysqlQuery = "DELETE FROM transactions";
    con.query(mysqlQuery, function(err, result) {
        if (err) throw err;
        console.log("Deleting all transactions...");
        return callback(result);
    });
}

function deleteTransactionById(id, callback) {
    if (useMock) {
        const data = readMockData();
        const updated = data.filter(item => item.id != id);
        writeMockData(updated);
        console.log(`Deleting transactions with id ${id} from local mock`);
        return callback([]);
    }

    var mysqlQuery = `DELETE FROM transactions WHERE id = ${id}`;
    con.query(mysqlQuery, function(err, result) {
        if (err) throw err;
        console.log(`Deleting transactions with id ${id}`);
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







