const pgPromise = require('pg-promise')
const pgp = pgPromise({ capSQL: true }) // Empty object means no additional config required

const pgpConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
}

exports.pgp = pgp
exports.db = pgp(pgpConfig)