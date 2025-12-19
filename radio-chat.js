// radio-chat.js - Sistema de chat en vivo con Firebase
class RadioChat {
    constructor() {
        this.messages = [];
        this.isInitialized = false;
        this.unsubscribeChat = null;
        this.userName = null;
    }

    async initialize() {
        try {
            // Importar módulos de Firebase
            const { collection, query, orderBy, limit, onSnapshot, addDoc } = 
                await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            
            const db = window.firebaseConfig.getDb();
            
            // Configurar listener en tiempo real
            const chatQuery = query(
                collection(db, 'radio_chat'),
                orderBy('timestamp', 'desc'),
                limit(50)
            );
            
            this.unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
                this.messages = [];
                snapshot.forEach((doc) => {
                    this.messages.unshift(doc.data()); // Revertir orden
                });
                this.updateChatDisplay();
                this.updateOnlineCount();
            });
            
            this.isInitialized = true;
            console.log("✅ Chat en vivo inicializado");
            
            // Cargar usuario desde localStorage
            const savedUser = localStorage.getItem('radioPlayer');
            if (savedUser) {
                this.userName = JSON.parse(savedUser).name;
            }
            
        } catch (error) {
            console.error("❌ Error inicializando chat:", error);
            this.isInitialized = false;
        }
    }

    async sendMessage(messageText, type = 'message') {
        if (!this.isInitialized) {
            console.warn("Chat no inicializado");
            return;
        }

        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const db = window.firebaseConfig.getDb();
            
            const userName = this.userName || 'Oyente';
            
            await addDoc(collection(db, 'radio_chat'), {
                id: Date.now(),
                playerName: userName,
                message: messageText,
                type: type,
                timestamp: new Date().toISOString(),
                displayTime: new Date().toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                userId: localStorage.getItem('radioPlayerId') || null
            });
            
        } catch (error) {
            console.error("❌ Error enviando mensaje:", error);
        }
    }

    updateChatDisplay() {
        const chatMessagesDiv = document.getElementById('radioChatMessages');
        if (!chatMessagesDiv) return;
        
        chatMessagesDiv.innerHTML = `
            <div class="radio-system-message">
                <i class="fas fa-info-circle"></i>
                <p>¡Bienvenido al chat de Radio IAM! Aquí puedes compartir tus intenciones de oración y participar durante el programa.</p>
            </div>
        `;
        
        this.messages.forEach(msg => {
            if (msg.type === 'system') {
                chatMessagesDiv.innerHTML += `
                    <div class="radio-system-message">
                        <i class="fas fa-broadcast-tower"></i>
                        <p>${msg.message}</p>
                        <span class="radio-chat-time">${msg.displayTime}</span>
                    </div>
                `;
            } else {
                const isCurrentUser = msg.playerName === this.userName;
                chatMessagesDiv.innerHTML += `
                    <div class="radio-chat-message ${isCurrentUser ? 'own-message' : ''}">
                        <div class="radio-chat-header-info">
                            <span class="radio-chat-user">${msg.playerName}</span>
                            <span class="radio-chat-time">${msg.displayTime}</span>
                        </div>
                        <div class="radio-chat-text">${msg.message}</div>
                    </div>
                `;
            }
        });
        
        // Auto-scroll al final
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    }

    updateOnlineCount() {
        // Contar usuarios únicos en los últimos 5 minutos
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const uniqueUsers = new Set();
        
        this.messages.forEach(msg => {
            if (new Date(msg.timestamp) > fiveMinutesAgo && msg.userId) {
                uniqueUsers.add(msg.userId);
            }
        });
        
        const onlineCount = document.getElementById('radioOnlineCount');
        if (onlineCount) {
            onlineCount.textContent = uniqueUsers.size;
        }
    }

    setUserName(name) {
        this.userName = name;
    }

    cleanup() {
        if (this.unsubscribeChat) {
            this.unsubscribeChat();
        }
    }
}

// Inicializar chat globalmente
window.radioChat = new RadioChat();