// firebase-config.js - VERSIÓN ACTUALIZADA PARA MULTIDISPOSITIVOS
// ===== CONFIGURACIÓN DE FIREBASE =====

// Configuración de tu proyecto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB5oQcEv5anwzjEM5aTNdavYqOBMsx2byE",
    authDomain: "iam-campamento-2026.firebaseapp.com",
    databaseURL: "https://iam-campamento-2026-default-rtdb.firebaseio.com",
    projectId: "iam-campamento-2026",
    storageBucket: "iam-campamento-2026.firebasestorage.app",
    messagingSenderId: "600822219804",
    appId: "1:600822219804:web:3f8345d0e8479592d88bd9"
};

// Colecciones para organización
const COLLECTIONS = {
    APPLICANTS: 'applicants',
    ADMINS: 'admins',
    SETTINGS: 'settings',
    // Colecciones para radio
    RADIO_GAMES: 'radio_games',
    RADIO_PLAYERS: 'radio_players',
    RADIO_MESSAGES: 'radio_messages',
    RADIO_SETTINGS: 'radio_settings',
    RADIO_TRANSACTIONS: 'radio_transactions'
};

// Variables globales
let firebaseApp, firebaseDb, firebaseAuth, firebaseStorage;

// Función para inicializar Firebase
async function initializeFirebase() {
    try {
        // Importar dinámicamente los módulos de Firebase
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const { getStorage } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js");
        
        // Inicializar Firebase
        firebaseApp = initializeApp(firebaseConfig);
        firebaseDb = getFirestore(firebaseApp);
        firebaseAuth = getAuth(firebaseApp);
        firebaseStorage = getStorage(firebaseApp);
        
        console.log("✅ Firebase inicializado correctamente para múltiples dispositivos");
        console.log("📡 Conexión: Todos los dispositivos verán los mismos datos");
        
        return { 
            success: true, 
            app: firebaseApp, 
            db: firebaseDb, 
            auth: firebaseAuth,
            storage: firebaseStorage
        };
    } catch (error) {
        console.error("❌ Error inicializando Firebase:", error);
        alert("⚠️ No se pudo conectar con el servidor. Algunas funciones pueden no estar disponibles.");
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
    getStorage: () => firebaseStorage
};