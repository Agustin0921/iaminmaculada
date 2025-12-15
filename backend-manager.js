// backend-manager.js
// ===== GESTIÓN DEL BACKEND =====

class BackendManager {
    constructor() {
        this.db = null;
        this.auth = null;
        this.isInitialized = false;
        this.currentUser = null;
        this.useLocalStorage = false; // Modo de respaldo
    }

    // ===== INICIALIZACIÓN =====
    async initialize() {
        try {
            // Intentar inicializar Firebase
            const firebaseConfig = window.firebaseConfig;
            if (!firebaseConfig) {
                throw new Error("Configuración de Firebase no encontrada");
            }

            const result = await firebaseConfig.initialize();
            
            if (result.success) {
                this.db = result.db;
                this.auth = result.auth;
                this.isInitialized = true;
                console.log("✅ BackendManager inicializado con Firebase");
                
                // Escuchar cambios en autenticación
                this.auth.onAuthStateChanged((user) => {
                    this.currentUser = user;
                    console.log("👤 Estado de autenticación:", user ? "Conectado" : "Desconectado");
                });
                
                return { success: true, mode: 'firebase' };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.warn("⚠️ Firebase no disponible, usando localStorage como respaldo");
            this.useLocalStorage = true;
            return { success: false, mode: 'localstorage', error: error.message };
        }
    }

    // ===== AUTENTICACIÓN =====
    async loginAdmin(email, password) {
        if (this.useLocalStorage || !this.isInitialized) {
            // Modo respaldo: verificar contra usuarios locales
            const localAdmins = this.getLocalAdmins();
            const admin = localAdmins.find(a => a.email === email && a.password === password);
            
            if (admin) {
                this.currentUser = { email: admin.email, isAdmin: true };
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminEmail', email);
                return { success: true, user: this.currentUser };
            }
            return { success: false, error: "Credenciales incorrectas" };
        }

        // Modo Firebase
        try {
            const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            this.currentUser = userCredential.user;
            return { success: true, user: this.currentUser };
        } catch (error) {
            return { success: false, error: this.translateAuthError(error.code) };
        }
    }

    async logoutAdmin() {
        if (this.useLocalStorage || !this.isInitialized) {
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminEmail');
            this.currentUser = null;
            return { success: true };
        }

        try {
            const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
            await signOut(this.auth);
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    isAdminAuthenticated() {
        if (this.useLocalStorage || !this.isInitialized) {
            return localStorage.getItem('adminLoggedIn') === 'true';
        }
        return this.currentUser !== null;
    }

    // ===== OPERACIONES CON SOLICITANTES =====
    async saveApplicant(applicantData) {
        // Primero guardar en localStorage (siempre)
        const localApplicants = this.getLocalApplicants();
        const applicantId = Date.now();
        const registrationNumber = `AVENT-${applicantId.toString().slice(-6)}`;
        
        const applicantToSave = {
            ...applicantData,
            id: applicantId,
            registrationNumber: registrationNumber,
            registrationDate: new Date().toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Guardar en localStorage
        localApplicants.push(applicantToSave);
        localStorage.setItem('iamApplicants', JSON.stringify(localApplicants));
        
        // Si Firebase está disponible, guardar también allí
        if (this.isInitialized && !this.useLocalStorage) {
            try {
                const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                await addDoc(collection(this.db, 'applicants'), applicantToSave);
                console.log("✅ Aventurero guardado en Firebase");
            } catch (error) {
                console.warn("⚠️ No se pudo guardar en Firebase, solo en localStorage");
            }
        }

        return { 
            success: true, 
            id: applicantId,
            registrationNumber: registrationNumber,
            data: applicantToSave 
        };
    }

    async getAllApplicants() {
        // Primero intentar desde Firebase
        if (this.isInitialized && !this.useLocalStorage) {
            try {
                const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                const q = query(collection(this.db, 'applicants'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                
                const applicants = [];
                querySnapshot.forEach((doc) => {
                    applicants.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                return { success: true, data: applicants, source: 'firebase' };
            } catch (error) {
                console.warn("⚠️ Error cargando de Firebase, usando localStorage");
            }
        }

        // Si Firebase falla o no está disponible, usar localStorage
        const localApplicants = this.getLocalApplicants();
        return { success: true, data: localApplicants, source: 'localstorage' };
    }

    async getRecentApplicants(limitCount = 5) {
        const result = await this.getAllApplicants();
        if (result.success) {
            const recent = result.data.slice(0, limitCount);
            return { success: true, data: recent, source: result.source };
        }
        return result;
    }

    async getApplicantCount() {
        const result = await this.getAllApplicants();
        if (result.success) {
            return { success: true, count: result.data.length };
        }
        return { success: false, count: 0 };
    }

    async clearAllData() {
        // Limpiar localStorage
        localStorage.removeItem('iamApplicants');
        
        // Si Firebase está disponible, limpiar también
        if (this.isInitialized && !this.useLocalStorage) {
            try {
                const { collection, getDocs, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                const querySnapshot = await getDocs(collection(this.db, 'applicants'));
                
                const deletePromises = [];
                querySnapshot.forEach((doc) => {
                    deletePromises.push(deleteDoc(doc.ref));
                });
                
                await Promise.all(deletePromises);
                console.log("✅ Todos los datos eliminados de Firebase");
            } catch (error) {
                console.error("❌ Error eliminando datos de Firebase:", error);
            }
        }
        
        return { success: true };
    }

    // ===== FUNCIONES AUXILIARES =====
    getLocalApplicants() {
        const stored = localStorage.getItem('iamApplicants');
        return stored ? JSON.parse(stored) : [];
    }

    getLocalAdmins() {
        // Admins por defecto (modificar según necesidad)
        return [
            { email: "admin@iam.com", password: "admin2026", name: "Administrador Principal" },
            { email: "organizador@iam.com", password: "campamento2026", name: "Organizador" }
        ];
    }

    translateAuthError(code) {
        const errors = {
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/invalid-email': 'Correo electrónico inválido',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
            'auth/user-disabled': 'Usuario deshabilitado'
        };
        return errors[code] || 'Error de autenticación';
    }

    // ===== SINCRONIZACIÓN =====
    async syncLocalToFirebase() {
        if (this.useLocalStorage || !this.isInitialized) return;
        
        const localApplicants = this.getLocalApplicants();
        if (localApplicants.length === 0) return;
        
        console.log(`🔄 Sincronizando ${localApplicants.length} aventureros locales a Firebase...`);
        
        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            for (const applicant of localApplicants) {
                try {
                    await addDoc(collection(this.db, 'applicants'), applicant);
                } catch (error) {
                    console.warn(`⚠️ No se pudo sincronizar aventurero ${applicant.id}:`, error.message);
                }
            }
            
            console.log("✅ Sincronización completada");
        } catch (error) {
            console.error("❌ Error en sincronización:", error);
        }
    }
}

// Crear instancia global
window.backendManager = new BackendManager();