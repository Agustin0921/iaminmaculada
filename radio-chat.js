// radio-chat.js - Sistema de chat en vivo con Firebase (VERSIÓN CORREGIDA)
class RadioChat {
    constructor() {
        this.messages = [];
        this.isInitialized = false;
        this.unsubscribeChat = null;
        this.userName = null;
        this.userId = null;
    }

    async initialize() {
        try {
            console.log("💬 Inicializando chat en vivo...");
            
            // Esperar a que Firebase esté listo
            if (!window.firebaseConfig || !window.firebaseConfig.getDb) {
                console.error("❌ Firebase no está disponible");
                return false;
            }
            
            const db = window.firebaseConfig.getDb();
            if (!db) {
                console.error("❌ No se pudo obtener la base de datos de Firebase");
                return false;
            }
            
            // Importar módulos de Firebase
            const { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } = 
                await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            // Configurar listener en tiempo real
            const chatQuery = query(
                collection(db, 'radio_chat'),
                orderBy('timestamp', 'desc'),
                limit(50)
            );
            
            console.log("🔍 Configurando listener para chat...");
            
            this.unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
                console.log("📨 Nuevos mensajes recibidos:", snapshot.docs.length);
                
                this.messages = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    this.messages.unshift({
                        id: doc.id,
                        ...data,
                        // Convertir Firebase Timestamp a formato legible
                        displayTime: this.formatTime(data.timestamp)
                    });
                });
                
                this.updateChatDisplay();
                this.updateOnlineCount();
                
            }, (error) => {
                console.error("❌ Error en listener de chat:", error);
            });
            
            this.isInitialized = true;
            console.log("✅ Chat en vivo inicializado correctamente");
            
            // Cargar usuario desde localStorage
            this.loadUserFromStorage();
            
            return true;
            
        } catch (error) {
            console.error("❌ Error inicializando chat:", error);
            this.isInitialized = false;
            return false;
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return '--:--';
        
        try {
            let date;
            
            // Caso 1: Firebase Timestamp (con seconds y nanoseconds)
            if (timestamp.seconds !== undefined) {
                date = new Date(timestamp.seconds * 1000);
            }
            // Caso 2: String ISO
            else if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            }
            // Caso 3: Objeto Date
            else if (timestamp instanceof Date) {
                date = timestamp;
            }
            // Caso 4: ServerTimestamp (objeto especial)
            else if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
                date = timestamp.toDate();
            }
            // Caso por defecto
            else {
                console.warn("Timestamp no reconocido:", timestamp);
                return '--:--';
            }
            
            // Validar que sea una fecha válida
            if (isNaN(date.getTime())) {
                return '--:--';
            }
            
            return date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
        } catch (error) {
            console.error("Error formateando tiempo:", error, timestamp);
            return '--:--';
        }
    }

    async sendMessage(messageText, type = 'message') {
        if (!this.isInitialized) {
            console.warn("⚠️ Chat no inicializado, intentando inicializar...");
            const initialized = await this.initialize();
            if (!initialized) {
                this.showLocalError("Chat no disponible. Intenta recargar la página.");
                return;
            }
        }

        if (!messageText.trim()) {
            console.warn("Mensaje vacío, no se envía");
            return;
        }

        try {
            const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const db = window.firebaseConfig.getDb();
            
            // Usar nombre del usuario o 'Oyente' como fallback
            const displayName = this.userName || 'Oyente';
            const userId = this.userId || 'unknown_' + Date.now();
            
            console.log(`📤 Enviando mensaje como ${displayName}: ${messageText.substring(0, 50)}...`);
            
            const messageData = {
                playerName: displayName,
                message: messageText,
                type: type,
                timestamp: serverTimestamp(), // Firebase maneja el timestamp
                userId: userId
            };
            
            const docRef = await addDoc(collection(db, 'radio_chat'), messageData);
            console.log("✅ Mensaje enviado con ID:", docRef.id);
            
            // Para feedback inmediato, agregar localmente
            const localMessage = {
                id: 'local_' + Date.now(),
                ...messageData,
                timestamp: new Date() // Usar fecha local para display inmediato
            };
            
            this.messages.push(localMessage);
            this.updateChatDisplay();
            
        } catch (error) {
            console.error("❌ Error enviando mensaje:", error);
            this.showLocalError("Error al enviar mensaje: " + error.message);
        }
    }

    updateChatDisplay() {
        const chatMessagesDiv = document.getElementById('radioChatMessages');
        if (!chatMessagesDiv) {
            console.warn("⚠️ No se encontró el contenedor de chat");
            return;
        }
        
        // Limpiar y mostrar mensajes
        chatMessagesDiv.innerHTML = '';
        
        // Mensaje de bienvenida
        const welcomeMsg = document.createElement('div');
        welcomeMsg.className = 'radio-system-message';
        welcomeMsg.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <p>¡Bienvenido al chat de Radio IAM! Aquí puedes compartir tus intenciones de oración y participar durante el programa.</p>
            <span class="radio-chat-time">${this.formatTime(new Date())}</span>
        `;
        chatMessagesDiv.appendChild(welcomeMsg);
        
        // Mostrar mensajes (máximo 30)
        const recentMessages = this.messages.slice(-30);
        
        recentMessages.forEach(msg => {
            const messageDiv = document.createElement('div');
            const timeFormatted = this.formatTime(msg.timestamp);
            
            if (msg.type === 'system') {
                messageDiv.className = 'radio-system-message';
                messageDiv.innerHTML = `
                    <i class="fas fa-broadcast-tower"></i>
                    <p>${msg.message}</p>
                    <span class="radio-chat-time">${timeFormatted}</span>
                `;
            } else {
                const isCurrentUser = msg.userId === this.userId;
                const isLocal = msg.id && msg.id.startsWith('local_');
                
                messageDiv.className = `radio-chat-message ${isCurrentUser ? 'own-message' : ''} ${isLocal ? 'local-message' : ''}`;
                
                messageDiv.innerHTML = `
                    <div class="radio-chat-header-info">
                        <span class="radio-chat-user">${msg.playerName}</span>
                        <span class="radio-chat-time">${timeFormatted}</span>
                    </div>
                    <div class="radio-chat-text">${msg.message}</div>
                    ${isLocal ? '<div class="local-badge"><i class="fas fa-clock"></i> Enviando...</div>' : ''}
                `;
            }
            
            chatMessagesDiv.appendChild(messageDiv);
        });
        
        // Auto-scroll al final
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }

    updateOnlineCount() {
        // Contar usuarios únicos en los últimos 10 minutos
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const uniqueUsers = new Set();
        
        this.messages.forEach(msg => {
            if (msg.timestamp) {
                let msgTime;
                
                // Convertir Firebase timestamp a Date
                if (msg.timestamp.seconds) {
                    msgTime = new Date(msg.timestamp.seconds * 1000);
                } else if (msg.timestamp instanceof Date) {
                    msgTime = msg.timestamp;
                } else if (typeof msg.timestamp === 'string') {
                    msgTime = new Date(msg.timestamp);
                }
                
                if (msgTime && msgTime > tenMinutesAgo && msg.userId) {
                    uniqueUsers.add(msg.userId);
                }
            }
        });
        
        const onlineCount = document.getElementById('radioOnlineCount');
        if (onlineCount) {
            onlineCount.textContent = uniqueUsers.size;
        }
    }

    // ... (el resto de tus funciones permanecen igual)
    loadUserFromStorage() { /* tu código */ }
    showLocalError(message) { /* tu código */ }
    cleanup() { /* tu código */ }
}

// Inicializar chat globalmente
window.radioChat = new RadioChat();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    if (document.querySelector('.radio-header')) {
        console.log("🔄 Iniciando chat para Radio IAM...");
        
        setTimeout(async () => {
            const success = await window.radioChat.initialize();
            if (success) {
                console.log("✅ Chat listo para usar");
            }
        }, 1000);
    }
});