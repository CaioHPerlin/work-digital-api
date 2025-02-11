const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const Validator = require('../utils/validator');

class User {
	static auth = async (req, res) => {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ message: 'Preencha ambos os campos.' });
		}

		try {
			const result = await db.execute({
				sql: 'SELECT * FROM user WHERE email = ?',
				args: [email],
			});
			const user = result.rows[0];

			if (!user) {
				return res.status(400).json({ message: 'E-mail ou senha inválidos.' });
			}

			const isPasswordValid = await bcrypt.compare(password, user.password);
			if (!isPasswordValid) {
				return res.status(400).json({ message: 'E-mail ou senha inválidos.' });
			}

			const token = jwt.sign({ id: String(user.id), email: user.email }, process.env.JWT_SECRET, {
				expiresIn: '1h',
			});

			res.status(200).json({ token, user });
		} catch (err) {
			console.error(err);
			res.status(500).json({
				message: 'Um erro ocorreu durante a autenticação.',
				error: err.stack,
			});
		}
	};

	static create = async (req, res) => {
		const { name, email, password, cpf, state, city, neighborhood, street, number, phone, birthdate } = req.body;

		if (
			!name ||
			!email ||
			!password ||
			!cpf ||
			!state ||
			!city ||
			!neighborhood ||
			!street ||
			!number ||
			!phone ||
			!birthdate
		) {
			return res.status(400).json({
				message:
					'Preencha todos os campos (name, email, password, cpf, state, city, neighborhood, street, number, phone, birthdate).',
			});
		}

		if (!Validator.isCPF(cpf)) {
			return res.status(400).json({ message: 'O CPF inserido é inválido.' });
		}

		// Sanitize input
		const sanitizedCpf = cpf.replace(/[^\d]/g, '');

		try {
			const existingUser = await db.execute({
				sql: 'SELECT * FROM user WHERE email = ? OR cpf = ?',
				args: [email, cpf],
			});
			if (existingUser.rows.length > 0) {
				return res.status(400).json({ message: 'E-mail ou CPF já cadastrados.' });
			}

			const hashedPassword = await bcrypt.hash(password, 10);

			const result = await db.execute({
				sql: 'INSERT INTO user (name, email, password, cpf, state, city, neighborhood, street, number, phone, birthdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
				args: [
					name,
					email,
					hashedPassword,
					sanitizedCpf,
					state,
					city,
					neighborhood,
					street,
					number,
					phone,
					birthdate,
				],
			});

			let userId = result.lastInsertRowid;
			if (typeof userId === 'bigint') {
				userId = Number(userId);
			}

			res.status(201).json({
				message: 'Usuário cadastrado com sucesso.',
				user: { id: '' + userId },
			});
		} catch (err) {
			console.error(err);
			res.status(500).json({
				message: 'Um erro ocorreu durante o cadastro do usuário.',
				error: err.stack,
			});
		}
	};

	static update = async (req, res) => {
		const { id } = req.params;
		const { name, password, state, city, neighborhood, street, number, phone, birthdate } = req.body;

		if (!name || !state || !city || !neighborhood || !street || !number || !phone || !birthdate) {
			return res.status(400).json({
				message:
					'Preencha todos os campos obrigatórios (name, password, state, city, neighborhood, street, number, phone, birthdate).',
			});
		}

		try {
			const result = await db.execute({
				sql: 'SELECT * FROM user WHERE id = ?',
				args: [id],
			});

			if (result.rows.length === 0) {
				return res.status(404).json({
					message: `O usuário de ID ${id} não foi encontrado no banco de dados.`,
				});
			}

			const user = result.rows[0];
			const hashedPassword = password ? await bcrypt.hash(password, 10) : user.password;

			await db.execute({
				sql: `UPDATE user 
					  SET name = ?, password = ?, state = ?, city = ?, neighborhood = ?, street = ?, number = ?, phone = ?, birthdate = ?
					  WHERE id = ?`,
				args: [name, hashedPassword, state, city, neighborhood, street, number, phone, birthdate, id],
			});

			res.status(200).json({ message: 'Usuário atualizado com sucesso.' });
		} catch (err) {
			console.error(err);
			res.status(500).json({
				message: 'Um erro ocorreu durante a atualização do usuário.',
				error: err.stack,
			});
		}
	};

	static getAll = async (req, res) => {
		try {
			const result = await db.execute({
				sql: 'SELECT * FROM user',
				args: [],
			});

			const users = result.rows;

			res.status(200).json(users);
		} catch (err) {
			console.error(err);
			res.status(500).json({
				message: 'Erro ao buscar usuários no banco de dados.',
				error: err.stack,
			});
		}
	};

	static getOne = async (req, res) => {
		const { id } = req.params;

		try {
			const result = await db.execute({
				sql: 'SELECT * FROM user WHERE id = ?',
				args: [id],
			});

			if (result.rows.length === 0) {
				return res.status(404).json({
					message: `O usuário de ID ${id} não foi encontrado no banco de dados.`,
				});
			}

			const user = result.rows[0];

			res.status(200).json(user);
		} catch (err) {
			console.error(err);
			res.status(500).json({
				message: 'Erro ao recuperar dados do usuário',
				error: err.stack,
			});
		}
	};

	static deleteOne = async (req, res) => {
		try {
			const { id } = req.params;
			const result = await db.execute({
				sql: 'SELECT * FROM user WHERE id = ?',
				args: [id],
			});

			if (result.rows.length === 0) {
				return res.status(404).json({
					message: `O usuário de ID ${id} não foi encontrado no banco de dados.`,
				});
			}

			await db.execute({
				sql: 'DELETE FROM user WHERE id = ?',
				args: [id],
			});

			res.status(200).json({ message: 'Usuário deletado com sucesso!', user: result.rows[0] });
		} catch (err) {
			console.error(err);
			res.status(500).json({
				message: 'Erro ao deletar usuário.',
				error: err.stack,
			});
		}
	};
}

module.exports = User;
