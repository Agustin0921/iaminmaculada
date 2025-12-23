const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const app = express();

// ======================
// CONFIGURACIÓN
// ======================
app.use(cors({
    origin: ['https://iaminmaculada.vercel.app/', 'http://localhost:3000', 'http://127.0.0.1:5500'],
    credentials: true
}));
app.use(express.json());

// Secret para JWT - CAMBIAR EN PRODUCCIÓN
const JWT_SECRET = process.env.JWT_SECRET || 'IAM2026_SUPER_SECRETO_CAMBIA_ESTO';

// ======================
// BASE DE DATOS SQLite
// ======================
let db;

async function initDatabase() {
    try {
        // En Render usa /tmp (persistente), localmente en carpeta
        const dbPath = process.env.NODE_ENV === 'production' 
            ? '/tmp/iam_database.db'
            : path.join(__dirname, 'iam_database.db');
        
        console.log('📁 Inicializando SQLite en:', dbPath);
        
        // Crear/abrir base de datos
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        
        // ======================
        // CREAR TABLAS
        // ======================
        
        // Tabla de administradores (SOLO TÚ CREAS CUENTAS)
        await db.exec(`
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'viewer', -- 'superadmin', 'admin', 'viewer'
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES admins(id)
            );
        `);
        
        // ======================
        // CREAR SUPERADMIN INICIAL (SOLO TÚ)
        // ======================
        const superAdminCheck = await db.get(
            'SELECT * FROM admins WHERE username = ?', 
            ['superadmin']
        );
        
        if (!superAdminCheck) {
            // CONTRASEÑA: IAM2026super (CÁMBIALA DESPUÉS)
            const hashedPassword = await bcrypt.hash('IAM2026super', 12);
            
            await db.run(
                `INSERT INTO admins 
                (username, password_hash, full_name, role, created_by) 
                VALUES (?, ?, ?, ?, ?)`,
                [
                    'superadmin',
                    hashedPassword,
                    'Administrador Principal',
                    'superadmin',
                    'system'
                ]
            );
            
            console.log('🔐 Superadmin creado: superadmin / IAM2026super');
            console.log('⚠️ ¡CAMBIA LA CONTRASEÑA INMEDIATAMENTE!');
        }
        
        // ======================
        // CREAR ALGUNOS ADMINS DE EJEMPLO
        // ======================
        const exampleAdmins = [
            {
                username: 'maria_admin',
                password: 'Maria2026',
                full_name: 'María González',
                role: 'admin'
            },
            {
                username: 'juan_viewer',
                password: 'Juan2026',
                full_name: 'Juan Pérez',
                role: 'viewer'
            }
        ];
        
        for (const admin of exampleAdmins) {
            const exists = await db.get(
                'SELECT * FROM admins WHERE username = ?', 
                [admin.username]
            );
            
            if (!exists) {
                const hashedPassword = await bcrypt.hash(admin.password, 12);
                await db.run(
                    `INSERT INTO admins 
                    (username, password_hash, full_name, role, created_by) 
                    VALUES (?, ?, ?, ?, ?)`,
                    [
                        admin.username,
                        hashedPassword,
                        admin.full_name,
                        admin.role,
                        'superadmin'
                    ]
                );
                console.log(`👤 Admin creado: ${admin.username} / ${admin.password}`);
            }
        }
        
        // Verificar datos existentes
        const adminCount = await db.get('SELECT COUNT(*) as total FROM admins');
        const applicantCount = await db.get('SELECT COUNT(*) as total FROM applicants');
        
        console.log(`
        ✅ Base de datos inicializada
        👑 Admins: ${adminCount.total}
        📝 Inscripciones: ${applicantCount.total}
        `);
        
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
        
        // Verificar que el admin existe y está activo
        const admin = await db.get(
            'SELECT * FROM admins WHERE id = ? AND is_active = 1',
            [decoded.adminId]
        );
        
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

// Middleware para verificar rol de superadmin
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
        endpoints: {
            public: {
                login: 'POST /api/admin/login',
                register: 'POST /api/applicants',
                stats: 'GET /api/stats'
            },
            admin: {
                dashboard: 'GET /api/admin/dashboard',
                applicants: 'GET /api/admin/applicants',
                export: 'GET /api/admin/export',
                manage_admins: 'GET /api/admin/manage'  // Solo superadmin
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
        
        // Verificar código secreto (OPCIONAL pero recomendado)
        if (adminCode && adminCode !== 'IAM2026') {
            return res.status(401).json({ 
                success: false, 
                error: 'Código secreto incorrecto' 
            });
        }
        
        // Buscar admin
        const admin = await db.get(
            'SELECT * FROM admins WHERE username = ? AND is_active = 1',
            [username]
        );
        
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                error: 'Usuario o contraseña incorrectos' 
            });
        }
        
        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Usuario o contraseña incorrectos' 
            });
        }
        
        // Actualizar último login
        await db.run(
            'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [admin.id]
        );
        
        // Crear token JWT
        const token = jwt.sign(
            { 
                adminId: admin.id, 
                username: admin.username,
                role: admin.role,
                name: admin.full_name 
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        
        // Registrar en log de auditoría
        await db.run(
            `INSERT INTO audit_log (admin_id, action, ip_address, user_agent)
             VALUES (?, ?, ?, ?)`,
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
            },
            permissions: getPermissionsByRole(admin.role)
        });
        
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

// ======================
// 2. REGISTRAR INSCRIPCIÓN
// ======================
app.post('/api/applicants', async (req, res) => {
    try {
        const {
            fullName, age, phone, parish, email,
            health = [], diet = [],
            emergencyContact, comments, transportation
        } = req.body;
        
        // Validaciones
        if (!fullName || fullName.trim().length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'El nombre debe tener al menos 3 caracteres' 
            });
        }
        
        if (!phone || phone.replace(/\D/g, '').length < 8) {
            return res.status(400).json({ 
                success: false, 
                error: 'Teléfono inválido' 
            });
        }
        
        // Generar número de registro único
        const registrationNumber = `AVENT-${Date.now().toString().slice(-8)}`;
        
        // Insertar en base de datos
        const result = await db.run(
            `INSERT INTO applicants (
                full_name, age, phone, parish, email,
                health_conditions, dietary_restrictions,
                emergency_contact, comments, transportation,
                registration_number, device_info, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                fullName.trim(),
                parseInt(age),
                phone.trim(),
                parish ? parish.trim() : null,
                email ? email.trim() : null,
                JSON.stringify(health),
                JSON.stringify(diet),
                emergencyContact.trim(),
                comments ? comments.trim() : '',
                transportation ? transportation.trim() : '',
                registrationNumber,
                req.get('User-Agent'),
                req.ip
            ]
        );
        
        const newApplicant = {
            id: result.lastID,
            fullName,
            age,
            phone,
            registrationNumber,
            registrationDate: new Date().toLocaleString('es-ES')
        };
        
        console.log(`✅ Nueva inscripción: ${fullName} (${registrationNumber})`);
        
        res.status(201).json({
            success: true,
            message: '✅ ¡Inscripción registrada exitosamente!',
            data: newApplicant
        });
        
    } catch (error) {
        console.error('Error registrando inscripción:', error);
        
        // Error de duplicado único
        if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE')) {
            return res.status(409).json({ 
                success: false, 
                error: '⚠️ Ya existe una inscripción con este nombre y teléfono' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Error al registrar la inscripción' 
        });
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
// ENDPOINTS PROTEGIDOS (REQUIEREN LOGIN)
// ======================

// ======================
// 4. DASHBOARD ADMIN
// ======================
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
    try {
        // Estadísticas para dashboard
        const [
            todayStats,
            ageStats,
            parishStats,
            recentApplicants,
            activityLog
        ] = await Promise.all([
            // Inscripciones de hoy
            db.get(`
                SELECT COUNT(*) as today_count 
                FROM applicants 
                WHERE DATE(created_at) = DATE('now')
            `),
            
            // Estadísticas de edad
            db.get(`
                SELECT 
                    AVG(age) as avg_age,
                    MIN(age) as min_age,
                    MAX(age) as max_age,
                    COUNT(CASE WHEN age BETWEEN 8 AND 10 THEN 1 END) as age_8_10,
                    COUNT(CASE WHEN age BETWEEN 11 AND 13 THEN 1 END) as age_11_13,
                    COUNT(CASE WHEN age BETWEEN 14 AND 17 THEN 1 END) as age_14_17
                FROM applicants
            `),
            
            // Parroquias más comunes
            db.all(`
                SELECT parish, COUNT(*) as count 
                FROM applicants 
                WHERE parish IS NOT NULL AND parish != ''
                GROUP BY parish 
                ORDER BY count DESC 
                LIMIT 5
            `),
            
            // Últimas 5 inscripciones
            db.all(`
                SELECT 
                    id, full_name, age, phone, parish, 
                    registration_number, created_at
                FROM applicants 
                ORDER BY created_at DESC 
                LIMIT 5
            `),
            
            // Actividad reciente (logins)
            db.all(`
                SELECT a.username, al.action, al.created_at
                FROM audit_log al
                JOIN admins a ON al.admin_id = a.id
                WHERE al.action = 'login'
                ORDER BY al.created_at DESC
                LIMIT 10
            `)
        ]);
        
        // Total de inscripciones
        const totalResult = await db.get('SELECT COUNT(*) as total FROM applicants');
        
        res.json({
            success: true,
            admin: {
                username: req.admin.username,
                name: req.admin.full_name,
                role: req.admin.role
            },
            stats: {
                total: totalResult.total || 0,
                today: todayStats.today_count || 0,
                availableSpots: Math.max(0, 100 - (totalResult.total || 0)),
                
                ages: {
                    average: ageStats.avg_age ? parseFloat(ageStats.avg_age).toFixed(1) : '0.0',
                    min: ageStats.min_age || 0,
                    max: ageStats.max_age || 0,
                    group_8_10: ageStats.age_8_10 || 0,
                    group_11_13: ageStats.age_11_13 || 0,
                    group_14_17: ageStats.age_14_17 || 0
                },
                
                medical: {
                    withConditions: ageStats.with_medical || 0
                },
                
                topParishes: parishStats,
                recentActivity: activityLog
            },
            recentApplicants: recentApplicants,
            serverTime: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error cargando dashboard' 
        });
    }
});

// ======================
// 5. OBTENER TODAS LAS INSCRIPCIONES
// ======================
app.get('/api/admin/applicants', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', sort = 'newest' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM applicants';
        let countQuery = 'SELECT COUNT(*) as total FROM applicants';
        let params = [];
        let whereClauses = [];
        
        // Filtro de búsqueda
        if (search) {
            whereClauses.push(`
                (full_name LIKE ? OR 
                 phone LIKE ? OR 
                 parish LIKE ? OR 
                 registration_number LIKE ?)
            `);
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        // Aplicar WHERE si hay filtros
        if (whereClauses.length > 0) {
            const where = ' WHERE ' + whereClauses.join(' AND ');
            query += where;
            countQuery += where;
        }
        
        // Ordenamiento
        const sortMap = {
            'newest': 'created_at DESC',
            'oldest': 'created_at ASC',
            'name': 'full_name ASC',
            'age': 'age DESC'
        };
        
        query += ` ORDER BY ${sortMap[sort] || 'created_at DESC'}`;
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        
        // Ejecutar consultas
        const [applicants, countResult] = await Promise.all([
            db.all(query, params),
            db.get(countQuery, params.slice(0, params.length - 2)) // Excluir LIMIT/OFFSET
        ]);
        
        // Registrar en log de auditoría
        await db.run(
            `INSERT INTO audit_log (admin_id, action, details)
             VALUES (?, ?, ?)`,
            [req.admin.id, 'view_applicants', `Página: ${page}, Búsqueda: "${search}"`]
        );
        
        res.json({
            success: true,
            data: applicants.map(app => ({
                ...app,
                health_conditions: JSON.parse(app.health_conditions || '[]'),
                dietary_restrictions: JSON.parse(app.dietary_restrictions || '[]')
            })),
            pagination: {
                total: countResult.total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(countResult.total / limit)
            },
            filters: {
                search,
                sort
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo inscripciones:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo inscripciones' 
        });
    }
});

// ======================
// 6. EXPORTAR A CSV
// ======================
app.get('/api/admin/export', authenticateToken, async (req, res) => {
    try {
        const applicants = await db.all(`
            SELECT 
                id, full_name, age, phone, parish, email,
                health_conditions, dietary_restrictions,
                emergency_contact, comments, transportation,
                registration_number, status,
                strftime('%d/%m/%Y %H:%M', created_at) as fecha
            FROM applicants 
            ORDER BY created_at DESC
        `);
        
        // Convertir a CSV
        const csvHeader = 'ID,Nombre,Edad,Teléfono,Email,Parroquia,Notas Médicas,Restricciones Alimentarias,Contacto Emergencia,Comentarios,Transporte,Código Registro,Estado,Fecha Registro\n';
        
        const csvRows = applicants.map(app => {
            const health = JSON.parse(app.health_conditions || '[]').join('; ');
            const diet = JSON.parse(app.dietary_restrictions || '[]').join('; ');
            
            return [
                app.id,
                `"${app.full_name}"`,
                app.age,
                `"${app.phone}"`,
                `"${app.email || ''}"`,
                `"${app.parish || ''}"`,
                `"${health}"`,
                `"${diet}"`,
                `"${app.emergency_contact}"`,
                `"${app.comments || ''}"`,
                `"${app.transportation || ''}"`,
                app.registration_number,
                app.status,
                `"${app.fecha}"`
            ].join(',');
        }).join('\n');
        
        const csv = csvHeader + csvRows;
        
        // Registrar exportación
        await db.run(
            `INSERT INTO audit_log (admin_id, action, details)
             VALUES (?, ?, ?)`,
            [req.admin.id, 'export_csv', `Registros exportados: ${applicants.length}`]
        );
        
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename="inscripciones_iam_${Date.now()}.csv"`);
        res.send(csv);
        
    } catch (error) {
        console.error('Error exportando CSV:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error exportando datos' 
        });
    }
});

// ======================
// 7. GESTIÓN DE ADMINS (SOLO SUPERADMIN)
// ======================
app.get('/api/admin/manage', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const admins = await db.all(`
            SELECT 
                id, username, full_name, role, 
                is_active, created_by, created_at, last_login
            FROM admins 
            ORDER BY created_at DESC
        `);
        
        res.json({
            success: true,
            admins,
            total: admins.length
        });
        
    } catch (error) {
        console.error('Error obteniendo admins:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error obteniendo lista de admins' 
        });
    }
});

// Crear nuevo admin (solo superadmin)
app.post('/api/admin/manage', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { username, password, full_name, role = 'viewer' } = req.body;
        
        if (!username || !password || !full_name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Faltan datos requeridos' 
            });
        }
        
        // Verificar si el usuario ya existe
        const exists = await db.get(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );
        
        if (exists) {
            return res.status(409).json({ 
                success: false, 
                error: 'El nombre de usuario ya existe' 
            });
        }
        
        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Crear admin
        await db.run(
            `INSERT INTO admins 
            (username, password_hash, full_name, role, created_by)
            VALUES (?, ?, ?, ?, ?)`,
            [username, hashedPassword, full_name, role, req.admin.username]
        );
        
        // Registrar en log
        await db.run(
            `INSERT INTO audit_log (admin_id, action, details)
             VALUES (?, ?, ?)`,
            [req.admin.id, 'create_admin', `Nuevo admin: ${username} (${role})`]
        );
        
        res.status(201).json({
            success: true,
            message: `✅ Admin ${username} creado exitosamente`,
            admin: { username, full_name, role }
        });
        
    } catch (error) {
        console.error('Error creando admin:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error creando administrador' 
        });
    }
});

// ======================
// 8. CAMBIAR CONTRASEÑA DE ADMIN
// ======================
app.post('/api/admin/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'Ambas contraseñas son requeridas' 
            });
        }
        
        // Verificar contraseña actual
        const validPassword = await bcrypt.compare(currentPassword, req.admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Contraseña actual incorrecta' 
            });
        }
        
        // Hashear nueva contraseña
        const newHashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Actualizar en base de datos
        await db.run(
            'UPDATE admins SET password_hash = ? WHERE id = ?',
            [newHashedPassword, req.admin.id]
        );
        
        res.json({
            success: true,
            message: '✅ Contraseña actualizada exitosamente'
        });
        
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error cambiando contraseña' 
        });
    }
});

// ======================
// FUNCIONES AUXILIARES
// ======================
function getPermissionsByRole(role) {
    const permissions = {
        superadmin: ['view', 'edit', 'delete', 'export', 'manage_admins', 'view_logs'],
        admin: ['view', 'edit', 'export'],
        viewer: ['view']
    };
    return permissions[role] || ['view'];
}

// ======================
// INICIAR SERVIDOR
// ======================
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await initDatabase();
        
        app.listen(PORT, () => {
            console.log(`
            🚀 IAM BACKEND 2026 - SQLite Edition
            ✅ Puerto: ${PORT}
            📍 URL: http://localhost:${PORT}
            🗄️  Base de datos: SQLite (Persistente)
            🔐 Superadmin: superadmin / IAM2026super
            📊 Roles: superadmin, admin, viewer
            ⏰ Iniciado: ${new Date().toLocaleString()}
            
            📌 ENDPOINTS:
            - POST /api/admin/login     (Login admin)
            - POST /api/applicants      (Nueva inscripción)
            - GET  /api/stats           (Estadísticas)
            - GET  /api/admin/dashboard (Panel admin)
            - GET  /api/admin/manage    (Gestionar admins - solo superadmin)
            `);
        });
        
    } catch (error) {
        console.error('❌ Error fatal iniciando servidor:', error);
        process.exit(1);
    }
}

// Manejar cierre limpio
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando base de datos...');
    if (db) await db.close();
    process.exit(0);
});

startServer();