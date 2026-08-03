# Local Development Changes

This document records the changes made to the project to enable it to run locally without active AWS infrastructure (such as an RDS MySQL Database, EC2 instances, or an Application Load Balancer). 

When you are ready to deploy to AWS, follow the restoration instructions below to revert these changes.

---

## Summary of Changes

### 1. Database Fallback (Mock DB)
*   **File:** [TransactionService.js](file:///c:/Users/HP/Desktop/AWS_Project1/application-code/app-tier/TransactionService.js)
*   **Purpose:** Allows the app-tier to fall back to a local JSON database file (`transactions.json`) if MySQL configuration is missing.
*   **Diff:**
    ```diff
    - const con = mysql.createConnection({
    -     host: dbcreds.DB_HOST,
    -     user: dbcreds.DB_USER,
    -     password: dbcreds.DB_PWD,
    -     database: dbcreds.DB_DATABASE
    - });
    + const fs = require('fs');
    + const path = require('path');
    + const useMock = !dbcreds.DB_HOST || dbcreds.DB_HOST.includes('<') || dbcreds.DB_HOST.trim() === '';
    + const dbFile = path.join(__dirname, 'transactions.json');
    + 
    + function readMockData() { ... }
    + function writeMockData(data) { ... }
    + 
    + let con;
    + if (!useMock) {
    +     con = mysql.createConnection({...});
    + } else {
    +     console.log("⚠️ MySQL credentials not configured. Falling back to JSON database.");
    + }
    ```

### 2. URL Path Stripping Middleware
*   **File:** [index.js](file:///c:/Users/HP/Desktop/AWS_Project1/application-code/app-tier/index.js)
*   **Purpose:** Strips the `/api` prefix from frontend requests before routing them to the Express app. In production, Nginx handles this prefix-stripping.
*   **Diff:**
    ```diff
      app.use(bodyParser.json());
      app.use(cors());
    + 
    + // Strip /api prefix for local development compatibility
    + app.use((req, res, next) => {
    +     if (req.url.startsWith('/api/')) {
    +         req.url = req.url.replace('/api/', '/');
    +     } else if (req.url === '/api') {
    +         req.url = '/';
    +     }
    +     next();
    + });
    + 
      // ROUTES FOR OUR API
    ```

### 3. Frontend Dev Server Proxy
*   **File:** [package.json](file:///c:/Users/HP/Desktop/AWS_Project1/application-code/web-tier/package.json)
*   **Purpose:** Proxy `/api` frontend requests to the local Express backend on `http://127.0.0.1:4000`.
*   **Diff:**
    ```diff
        "development": [
          "last 1 chrome version",
          "last 1 firefox version",
          "last 1 safari version"
        ]
    -   },
    -   "homepage": "."
    +   },
    +   "homepage": ".",
    +   "proxy": "http://127.0.0.1:4000"
      }
    ```

---

## Reverting Changes for AWS Deployment

To revert the codebase back to its original AWS-compatible state, follow these steps:

### Step 1: Revert `TransactionService.js`
Replace all contents of [TransactionService.js](file:///c:/Users/HP/Desktop/AWS_Project1/application-code/app-tier/TransactionService.js) with:
```javascript
const dbcreds = require('./DbConfig');
const mysql = require('mysql');

const con = mysql.createConnection({
    host: dbcreds.DB_HOST,
    user: dbcreds.DB_USER,
    password: dbcreds.DB_PWD,
    database: dbcreds.DB_DATABASE
});

function addTransaction(amount,desc){
    var mysql = `INSERT INTO \`transactions\` (\`amount\`, \`description\`) VALUES ('${amount}','${desc}')`;
    con.query(mysql, function(err,result){
        if (err) throw err;
        console.log("Adding to the table should have worked");
    }) 
    return 200;
}

function getAllTransactions(callback){
    var mysql = "SELECT * FROM transactions";
    con.query(mysql, function(err,result){
        if (err) throw err;
        console.log("Getting all transactions...");
        return(callback(result));
    });
}

function findTransactionById(id,callback){
    var mysql = `SELECT * FROM transactions WHERE id = ${id}`;
    con.query(mysql, function(err,result){
        if (err) throw err;
        console.log(`retrieving transactions with id ${id}`);
        return(callback(result));
    }) 
}

function deleteAllTransactions(callback){
    var mysql = "DELETE FROM transactions";
    con.query(mysql, function(err,result){
        if (err) throw err;
        console.log("Deleting all transactions...");
        return(callback(result));
    }) 
}

function deleteTransactionById(id, callback){
    var mysql = `DELETE FROM transactions WHERE id = ${id}`;
    con.query(mysql, function(err,result){
        if (err) throw err;
        console.log(`Deleting transactions with id ${id}`);
        return(callback(result));
    }) 
}

module.exports = {addTransaction ,getAllTransactions, deleteAllTransactions, findTransactionById, deleteTransactionById};
```

### Step 2: Revert `index.js`
Remove the `/api` prefix-rewriting middleware from [index.js](file:///c:/Users/HP/Desktop/AWS_Project1/application-code/app-tier/index.js) (lines 15-24).

### Step 3: Revert `package.json`
Remove the `"proxy"` field from [package.json](file:///c:/Users/HP/Desktop/AWS_Project1/application-code/web-tier/package.json).

### Step 4: Clean up Local Artifacts
Delete the local JSON database file:
*   [transactions.json](file:///c:/Users/HP/Desktop/AWS_Project1/application-code/app-tier/transactions.json)
