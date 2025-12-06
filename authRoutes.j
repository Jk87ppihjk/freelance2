const express = require('express');
const router = express.Router();
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

// --- Rota de Cadastro (Register) ---
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password || password.length < 6) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios e a senha deve ter 6+ caracteres.' });
    }

    try {
        // 1. Verificar se o usuário já existe
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'O email já está cadastrado.' });
        }

        // 2. Criptografar a senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Inserir novo usuário no DB
        const result = await db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        // 4. Sucesso no cadastro
        res.status(201).json({ 
            message: 'Usuário registrado com sucesso.', 
            userId: result[0].insertId,
            name: name
        });

    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao registrar usuário.' });
    }
});

// --- Rota de Login ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        // 1. Buscar usuário por email
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(400).json({ message: 'Credenciais inválidas (Email não encontrado).' });
        }

        // 2. Comparar a senha
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciais inválidas (Senha incorreta).' });
        }

        // 3. Gerar Token JWT
        const payload = { 
            id: user.id,
            name: user.name,
            email: user.email 
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }); // Expira em 1 dia

        // 4. Sucesso no login
        res.json({ 
            message: 'Login bem-sucedido', 
            token: token,
            user: { id: user.id, name: user.name, email: user.email }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
});


module.exports = router;
