// radio-chat.js - Sistema de chat en vivo con Firebase
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
                        // Asegurar formato de tiempo
                        displayTime: data.displayTime || this.formatTime(data.timestamp)
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

    loadUserFromStorage() {
        try {
            const savedPlayer = localStorage.getItem('radioPlayer');
            if (savedPlayer) {
                const player = JSON.parse(savedPlayer);
                this.userName = player.name;
                this.userId = player.id || player.firebaseId || 'user_' + Date.now();
                console.log(`👤 Usuario cargado: ${this.userName}`);
            } else {
                this.userName = 'Oyente';
                this.userId = 'guest_' + Date.now();
            }
        } catch (error) {
            console.error("❌ Error cargando usuario:", error);
            this.userName = 'Oyente';
            this.userId = 'guest_' + Date.now();
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
                timestamp: serverTimestamp ? serverTimestamp() : new Date().toISOString(),
                displayTime: new Date().toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                userId: userId,
                // Para depuración
                _debug: {
                    sentAt: new Date().toISOString(),
                    userAgent: navigator.userAgent.substring(0, 50)
                }
            };
            
            const docRef = await addDoc(collection(db, 'radio_chat'), messageData);
            console.log("✅ Mensaje enviado con ID:", docRef.id);
            
            // Actualizar localmente para feedback inmediato
            this.messages.push({
                id: 'local_' + Date.now(),
                ...messageData,
                timestamp: messageData.timestamp instanceof Object ? new Date().toISOString() : messageData.timestamp
            });
            this.updateChatDisplay();
            
        } catch (error) {
            console.error("❌ Error enviando mensaje:", error);
            this.showLocalError("Error al enviar mensaje: " + error.message);
            
            // Fallback: guardar localmente
            this.saveMessageLocally(messageText, type);
        }
    }

    saveMessageLocally(messageText, type) {
        const message = {
            id: 'local_' + Date.now(),
            playerName: this.userName || 'Oyente',
            message: messageText,
            type: type,
            timestamp: new Date().toISOString(),
            displayTime: new Date().toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            userId: this.userId || 'local_user',
            isLocal: true
        };
        
        this.messages.push(message);
        this.updateChatDisplay();
        
        // Guardar en localStorage como respaldo
        const localMessages = JSON.parse(localStorage.getItem('radioChatBackup') || '[]');
        localMessages.push(message);
        if (localMessages.length > 100) localMessages.shift();
        localStorage.setItem('radioChatBackup', JSON.stringify(localMessages));
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
        `;
        chatMessagesDiv.appendChild(welcomeMsg);
        
        // Mostrar mensajes (máximo 30)
        const recentMessages = this.messages.slice(-30);
        
        recentMessages.forEach(msg => {
            const messageDiv = document.createElement('div');
            
            if (msg.type === 'system') {
                messageDiv.className = 'radio-system-message';
                messageDiv.innerHTML = `
                    <i class="fas fa-broadcast-tower"></i>
                    <p>${msg.message}</p>
                    <span class="radio-chat-time">${msg.displayTime || this.formatTime(msg.timestamp)}</span>
                `;
            } else {
                const isCurrentUser = msg.userId === this.userId;
                messageDiv.className = `radio-chat-message ${isCurrentUser ? 'own-message' : ''} ${msg.isLocal ? 'local-message' : ''}`;
                
                messageDiv.innerHTML = `
                    <div class="radio-chat-header-info">
                        <span class="radio-chat-user">${msg.playerName}</span>
                        <span class="radio-chat-time">${msg.displayTime || this.formatTime(msg.timestamp)}</span>
                    </div>
                    <div class="radio-chat-text">${msg.message}</div>
                    ${msg.isLocal ? '<div class="local-badge"><i class="fas fa-exclamation-triangle"></i> Enviando...</div>' : ''}
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
                const msgTime = new Date(msg.timestamp.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp);
                if (msgTime > tenMinutesAgo && msg.userId) {
                    uniqueUsers.add(msg.userId);
                }
            }
        });
        
        const onlineCount = document.getElementById('radioOnlineCount');
        if (onlineCount) {
            onlineCount.textContent = uniqueUsers.size;
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return '--:--';
        
        try {
            let date;
            if (timestamp.seconds) {
                // Firebase Timestamp
                date = new Date(timestamp.seconds * 1000);
            } else if (typeof timestamp === 'string') {
                // String ISO
                date = new Date(timestamp);
            } else if (timestamp instanceof Date) {
                // Objeto Date
                date = timestamp;
            } else {
                return '--:--';
            }
            
            return date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (error) {
            return '--:--';
        }
    }

    setUserName(name) {
        if (name && name.trim()) {
            this.userName = name.trim();
            console.log(`👤 Nombre de usuario actualizado: ${this.userName}`);
        }
    }

    setUserId(id) {
        if (id) {
            this.userId = id;
        }
    }

    showLocalError(message) {
        // Mostrar error temporal en el chat
        const errorMsg = {
            id: 'error_' + Date.now(),
            playerName: 'Sistema',
            message: message,
            type: 'system',
            timestamp: new Date().toISOString(),
            displayTime: new Date().toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            userId: 'system'
        };
        
        this.messages.push(errorMsg);
        this.updateChatDisplay();
    }

    cleanup() {
        if (this.unsubscribeChat) {
            console.log("🧹 Limpiando listener de chat...");
            this.unsubscribeChat();
        }
    }
}

// Inicializar chat globalmente
window.radioChat = new RadioChat();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    // Solo inicializar si estamos en la página de radio
    if (document.querySelector('.radio-header')) {
        console.log("🔄 Iniciando chat para Radio IAM...");
        
        // Pequeño delay para asegurar que Firebase esté listo
        setTimeout(async () => {
            const success = await window.radioChat.initialize();
            if (success) {
                console.log("✅ Chat listo para usar");
                
                // Cargar mensajes de respaldo si hay
                const backupMessages = localStorage.getItem('radioChatBackup');
                if (backupMessages) {
                    console.log("📦 Cargando mensajes de respaldo...");
                }
            } else {
                console.error("❌ No se pudo inicializar el chat");
            }
        }, 1000);
    }
});