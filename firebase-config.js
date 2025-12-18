// firebase-config.js - VERSIÓN ACTUALIZADA
// ===== CONFIGURACIÓN DE FIREBASE =====

// Configuración de tu proyecto Firebase
const firebaseConfig = {
    "apiKey": "AIzaSyB5oQcEv5anwzjEM5aTNdavYqOBMsx2byE",
    "authDomain": "iam-campamento-2026.firebaseapp.com",
    "projectId": "iam-campamento-2026",
    "storageBucket": "iam-campamento-2026.firebasestorage.app",
    "messagingSenderId": "600822219804",
    "appId": "1:600822219804:web:3f8345d0e8479592d88bd9"
};

// Colecciones de Firestore
const COLLECTIONS = {
    APPLICANTS: 'applicants',
    ADMINS: 'admins',
    SETTINGS: 'settings',
    // Nuevas colecciones para radio
    RADIO_GAMES: 'radio_games',
    RADIO_PLAYERS: 'radio_players',
    RADIO_RANKING: 'radio_ranking',
    RADIO_ADMINS: 'radio_admins'
};

// Variables globales
let firebaseApp, firebaseDb, firebaseAuth, firebaseRTDB;

// Función para inicializar Firebase
async function initializeFirebase() {
    try {
        // Importar dinámicamente los módulos de Firebase
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const { getDatabase } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        
        // Inicializar Firebase
        firebaseApp = initializeApp(firebaseConfig);
        firebaseDb = getFirestore(firebaseApp);
        firebaseAuth = getAuth(firebaseApp);
        firebaseRTDB = getDatabase(firebaseApp);
        
        console.log("✅ Firebase inicializado correctamente");
        return { 
            success: true, 
            app: firebaseApp, 
            db: firebaseDb, 
            auth: firebaseAuth,
            rtdb: firebaseRTDB
        };
    } catch (error) {
        console.error("❌ Error inicializando Firebase:", error);
        return { success: false, error: error.message };
    }
}

// Exportar para uso global
window.firebaseConfig = {
    config: firebaseConfig,
    collections: COLLECTIONS,
    initialize: initializeFirebase,
    getApp: () => firebaseApp,
    getDb: () => firebaseDb,
    getAuth: () => firebaseAuth,
    getRTDB: () => firebaseRTDB
};