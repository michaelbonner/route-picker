import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://root:root@127.0.0.1:5432/route-picker',
});

async function testConnection() {
    try {
        console.log('Attempting to connect to database...');
        const client = await pool.connect();
        console.log('Successfully connected to database!');
        
        const res = await client.query('SELECT NOW()');
        console.log('Current time from DB:', res.rows[0].now);
        
        client.release();
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
}

testConnection();
