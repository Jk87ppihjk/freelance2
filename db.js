const mysql = require('mysql2/promise');
require('dotenv').config();

// Configurações de conexão usando as variáveis de ambiente
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Cria o pool de conexões
const pool = mysql.createPool(dbConfig);

// Função para testar a conexão e logar o status
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexão com o MySQL estabelecida com sucesso!');
        connection.release();
    } catch (error) {
        console.error('❌ Erro ao conectar ao MySQL:', error.message);
        // Em um ambiente de produção, você pode querer sair do processo aqui
        // process.exit(1);
    }
}

testConnection();

module.exports = pool;
