import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '192.168.0.156',
  port: 3306,
  user: 'alluser',
  password: 'wew111589',
  database: 'zoltraak',
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
