const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const app = express();

// ======================
// MANEJO DE ERRORES GLOBAL
// ======================
process.on('uncaughtException', (error) => {
    console.error('❌ ERROR NO CAPTURADO:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ PROMESA RECHAZADA:', reason);
});

// ======================
// CONFIGURACIÓN CORS (¡CORREGIDO!)
// ======================
app.use(cors({
    origin: [
        'https://iaminmaculada.vercel.app',  // ✅ SIN SLASH
        'http://localhost:3000', 
        'http://127.0.0.1:5500',
        'http://localhost:5500'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Manejar preflight OPTIONS
app.options('*', cors());

app.use(express.json());

// Secret para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'IAM2026_SUPER_SECRETO_CAMBIA_ESTO';

// ======================
// BASE DE DATOS SQLite
// ======================
let db;

async function initDatabase() {
    try {
        const dbPath = process.env.NODE_ENV === 'production' 
            ? '/tmp/iam_database.db'
            : path.join(__dirname, 'iam_database.db');
        
        console.log('📁 Inicializando SQLite en:', dbPath);
        
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        
        // ======================
        // CREAR TABLAS
        // ======================
        await db.exec(`
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'viewer',
                is_active BOOLEAN DEFAULT 1,
                created_by TEXT DEFAULT 'system',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS applicants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                age INTEGER NOT NULL,
                phone TEXT NOT NULL,
                parish TEXT,
                email TEXT,
                health_conditions TEXT,
                dietary_restrictions TEXT,
                emergency_contact TEXT NOT NULL,
                comments TEXT,
                transportation TEXT,
                registration_number TEXT UNIQUE,
                status TEXT DEFAULT 'pending',
                device_info TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(full_name, phone)
            );
            
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // ======================
        // CREAR SUPERADMIN INICIAL
        // ======================
        const superAdminCheck = await db.get(
            'SELECT * FROM admins WHERE username = ?', 
            ['superadmin']
        );
        
        if (!superAdminCheck) {
            const hashedPassword = await bcrypt.hash('IAM2026super', 12);
            
            await db.run(
                `INSERT INTO admins 
                (username, password_hash, full_name, role, created_by) 
                VALUES (?, ?, ?, ?, ?)`,
                ['superadmin', hashedPassword, 'Administrador Principal', 'superadmin', 'system']
            );
            
            console.log('🔐 Superadmin creado: superadmin / IAM2026super');
        }
        
        // ======================
        // CREAR ADMINS DE EJEMPLO
        // ======================
        const exampleAdmins = [
            { username: 'maria_admin', password: 'Maria2026', full_name: 'María González', role: 'admin' },
            { username: 'juan_viewer', password: 'Juan2026', full_name: 'Juan Pérez', role: 'viewer' }
        ];
        
        for (const admin of exampleAdmins) {
            const exists = await db.get('SELECT * FROM admins WHERE username = ?', [admin.username]);
            if (!exists) {
                const hashedPassword = await bcrypt.hash(admin.password, 12);
                await db.run(
                    `INSERT INTO admins (username, password_hash, full_name, role, created_by) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [admin.username, hashedPassword, admin.full_name, admin.role, 'superadmin']
                );
                console.log(`👤 Admin creado: ${admin.username} / ${admin.password}`);
            }
        }
        
        const adminCount = await db.get('SELECT COUNT(*) as total FROM admins');
        const applicantCount = await db.get('SELECT COUNT(*) as total FROM applicants');
        
        console.log(`✅ Base de datos inicializada - Admins: ${adminCount.total}, Inscripciones: ${applicantCount.total}`);
        
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

// ======================
// MIDDLEWARE DE AUTENTICACIÓN
// ======================
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const admin = await db.get('SELECT * FROM admins WHERE id = ? AND is_active = 1', [decoded.adminId]);
        
        if (!admin) {
            return res.status(401).json({ error: 'Admin no encontrado o inactivo' });
        }
        
        req.admin = admin;
        next();
        
    } catch (error) {
        console.error('Error de autenticación:', error);
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

const requireSuperAdmin = async (req, res, next) => {
    if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ error: 'Se requiere rol de superadmin' });
    }
    next();
};

// ======================
// ENDPOINTS PÚBLICOS
// ======================
app.get('/', (req, res) => {
    res.json({
        service: 'IAM Backend 2026',
        version: '2.0',
        status: 'online',
        timestamp: new Date().toISOString(),
        endpoints: {
            public: {
                login: 'POST /api/admin/login',
                register: 'POST /api/applicants',
                stats: 'GET /api/stats'
            }
        }
    });
});

// ======================
// 1. LOGIN DE ADMINISTRADOR
// ======================
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password, adminCode } = req.body;
        
        // Verificar código secreto
        if (!adminCode || adminCode !== 'IAM2026') {
            return res.status(401).json({ 
                success: false, 
                error: 'Código secreto incorrecto' 
            });
        }
        
        const admin = await db.get('SELECT * FROM admins WHERE username = ? AND is_active = 1', [username]);
        
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                error: 'Usuario o contraseña incorrectos' 
            });
        }
        
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Usuario o contraseña incorrectos' 
            });
        }
        
        await db.run('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [admin.id]);
        
        const token = jwt.sign(
            { adminId: admin.id, username: admin.username, role: admin.role, name: admin.full_name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        
        await db.run(
            `INSERT INTO audit_log (admin_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)`,
            [admin.id, 'login', req.ip, req.get('User-Agent')]
        );
        
        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                full_name: admin.full_name,
                role: admin.role,
                created_at: admin.created_at
            }
        });
        
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

// ======================
// 2. REGISTRAR INSCRIPCIÓN
// ======================
app.post('/api/applicants', async (req, res) => {
    try {
        const { fullName, age, phone, parish, email, health = [], diet = [], emergencyContact, comments, transportation } = req.body;
        
        if (!fullName || fullName.trim().length < 3) {
            return res.status(400).json({ success: false, error: 'El nombre debe tener al menos 3 caracteres' });
        }
        
        if (!phone || phone.replace(/\D/g, '').length < 8) {
            return res.status(400).json({ success: false, error: 'Teléfono inválido' });
        }
        
        const registrationNumber = `AVENT-${Date.now().toString().slice(-8)}`;
        
        const result = await db.run(
            `INSERT INTO applicants (
                full_name, age, phone, parish, email,
                health_conditions, dietary_restrictions,
                emergency_contact, comments, transportation,
                registration_number, device_info, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                fullName.trim(), parseInt(age), phone.trim(),
                parish ? parish.trim() : null, email ? email.trim() : null,
                JSON.stringify(health), JSON.stringify(diet),
                emergencyContact.trim(), comments ? comments.trim() : '',
                transportation ? transportation.trim() : '',
                registrationNumber, req.get('User-Agent'), req.ip
            ]
        );
        
        console.log(`✅ Nueva inscripción: ${fullName} (${registrationNumber})`);
        
        res.status(201).json({
            success: true,
            message: '✅ ¡Inscripción registrada exitosamente!',
            data: {
                id: result.lastID,
                fullName,
                registrationNumber,
                registrationDate: new Date().toLocaleString('es-ES')
            }
        });
        
    } catch (error) {
        console.error('Error registrando inscripción:', error);
        
        if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE')) {
            return res.status(409).json({ success: false, error: '⚠️ Ya existe una inscripción con este nombre y teléfono' });
        }
        
        res.status(500).json({ success: false, error: 'Error al registrar la inscripción' });
    }
});

// ======================
// 3. ESTADÍSTICAS PÚBLICAS
// ======================
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await db.get(`
            SELECT 
                COUNT(*) as total,
                AVG(age) as avg_age,
                SUM(CASE WHEN health_conditions != '[]' THEN 1 ELSE 0 END) as with_medical,
                COUNT(DISTINCT parish) as parishes_count
            FROM applicants
        `);
        
        res.json({
            success: true,
            total: stats.total || 0,
            avgAge: stats.avg_age ? parseFloat(stats.avg_age).toFixed(1) : '0.0',
            withMedical: stats.with_medical || 0,
            parishesCount: stats.parishes_count || 0,
            availableSpots: Math.max(0, 100 - (stats.total || 0)),
            updated: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error obteniendo stats:', error);
        res.json({
            success: true,
            total: 0,
            avgAge: '0.0',
            availableSpots: 100,
            updated: new Date().toISOString()
        });
    }
});

// ======================
// 4. DASHBOARD ADMIN
// ======================
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
    try {
        const [totalResult, todayStats] = await Promise.all([
            db.get('SELECT COUNT(*) as total FROM applicants'),
            db.get(`SELECT COUNT(*) as today_count FROM applicants WHERE DATE(created_at) = DATE('now')`)
        ]);
        
        res.json({
            success: true,
            admin: { username: req.admin.username, role: req.admin.role },
            stats: {
                total: totalResult.total || 0,
                today: todayStats.today_count || 0,
                availableSpots: Math.max(0, 100 - (totalResult.total || 0))
            },
            serverTime: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).json({ success: false, error: 'Error cargando dashboard' });
    }
});

// ======================
// 5. OBTENER INSCRIPCIONES
// ======================
app.get('/api/admin/applicants', authenticateToken, async (req, res) => {
    try {
        const applicants = await db.all('SELECT * FROM applicants ORDER BY created_at DESC LIMIT 100');
        
        res.json({
            success: true,
            data: applicants.map(app => ({
                ...app,
                health_conditions: JSON.parse(app.health_conditions || '[]'),
                dietary_restrictions: JSON.parse(app.dietary_restrictions || '[]')
            }))
        });
        
    } catch (error) {
        console.error('Error obteniendo inscripciones:', error);
        res.status(500).json({ success: false, error: 'Error obteniendo inscripciones' });
    }
});

// ======================
// 6. ENDPOINT DE SALUD
// ======================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'IAM Backend',
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'disconnected'
    });
});

// ======================
// MANEJO DE ERRORES 404
// ======================
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// ======================
// MANEJO DE ERRORES GLOBAL
// ======================
app.use((err, req, res, next) => {
    console.error('❌ Error del servidor:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ======================
// INICIAR SERVIDOR (¡CORREGIDO PARA RENDER!)
// ======================
const PORT = process.env.PORT || 10000; // Render usa 10000

async function startServer() {
    try {
        await initDatabase();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`
            🚀 IAM BACKEND 2026 - SQLite Edition
            ✅ Puerto: ${PORT}
            📍 URL: http://0.0.0.0:${PORT}
            🗄️  Base de datos: SQLite
            🔐 Superadmin: superadmin / IAM2026super
            🔑 Código secreto: IAM2026
            ⏰ Iniciado: ${new Date().toLocaleString()}
            `);
        });
        
    } catch (error) {
        console.error('❌ Error fatal iniciando servidor:', error);
        process.exit(1);
    }
}

// Manejar cierre
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando base de datos...');
    if (db) await db.close();
    process.exit(0);
});

// Iniciar
startServer();