const db = require('./src/db');

setTimeout(() => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Users in DB:");
            console.table(rows);
        }
    });
}, 1000);
