// ===== DIAGNÓSTICO INICIAL =====
console.log("🔍 DIAGNÓSTICO - Estado del sistema:");
console.log("- Firebase config:", window.firebaseConfig ? "Presente" : "Ausente");
console.log("- Backend Manager:", window.backendManager ? "Presente" : "Ausente");
console.log("- LocalStorage disponible:", typeof localStorage !== 'undefined' ? "Sí" : "No");
console.log("- Navegador:", navigator.userAgent);
console.log("- Online:", navigator.onLine);

const RENDER_BACKEND_URL = 'https://iaminmaculada.onrender.com';

// ===== VARIABLES GLOBALES =====
let applicantCount = 0;
let applicants = [];
let isAdminAuthenticated = false;
const MAX_SPOTS = 100;
const adminPassword = "IAM2026";
const adminUsers = [
    { username: "admin", password: "admin123", code: "IAM2026" },
    { username: "organizador", password: "campamento2026", code: "IAM2026" }
];

// Configuración de fechas
const CAMP_START_DATE = new Date('2026-01-08T09:00:00');

// Paleta de colores para PDF (actualizada)
const PDF_COLORS = {
    primary: [42, 110, 187],     // Azul aventurero
    secondary: [255, 179, 71],   // Naranja atardecer
    accent: [255, 107, 139],     // Rosa vibrante
    light: [247, 250, 252],      // Fondo claro
    dark: [26, 32, 44],          // Texto oscuro
    success: [56, 178, 172]      // Verde turquesa
};

// ===== INICIALIZACIÓN MEJORADA =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 ¡La Aventura Misionera IAM 2026 está cargada!");
    
    // Inicializar backend primero
    if (window.backendManager) {
        try {
            const backendResult = await window.backendManager.initialize();
            console.log("✅ Backend inicializado en modo:", backendResult.mode);
        } catch (error) {
            console.warn("⚠️ Backend no disponible, usando solo localStorage");
        }
    }
    
    // Cargar datos
    await loadApplicantsFromStorage();
    
    // LIMPIAR DUPLICADOS AUTOMÁTICAMENTE
    removeDuplicateApplicants();
    
    updateApplicantCounter();
    updateAvailableSpots();
    
    // Inicializar otros componentes
    initNavigation();
    initCountdown();
    initForm();
    initGallery();
    initModals();
    initAdminSystem();
    
    // Animaciones de scroll
    initScrollAnimations();
    
    if (isAdminAuthenticated) {
        updateAdminStats();
    }
});

// ===== SISTEMA DE NAVEGACIÓN =====
function initNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mainNav = document.getElementById('mainNav');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (!mobileMenuBtn || !mainNav) return;
    
    // Función para actualizar visibilidad del botón hamburguesa
    function updateMenuVisibility() {
        if (window.innerWidth <= 768) {
            mobileMenuBtn.style.display = 'flex';
            mainNav.classList.remove('active'); // Asegurar que esté cerrado
            mobileMenuBtn.querySelector('i').classList.remove('fa-times');
            mobileMenuBtn.querySelector('i').classList.add('fa-bars');
        } else {
            mobileMenuBtn.style.display = 'none';
            mainNav.classList.remove('active'); // Restaurar navegación normal
            mobileMenuBtn.querySelector('i').classList.remove('fa-times');
            mobileMenuBtn.querySelector('i').classList.add('fa-bars');
            document.body.style.overflow = ''; // Restaurar scroll
        }
    }
    
    // Llamar una vez al cargar
    updateMenuVisibility();
    
    // ABRIR/CERRAR menú hamburguesa
    mobileMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // Evitar que se propague al document
        
        mainNav.classList.toggle('active');
        const icon = mobileMenuBtn.querySelector('i');
        
        if (mainNav.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
            document.body.style.overflow = 'hidden'; // Bloquear scroll
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
            document.body.style.overflow = ''; // Permitir scroll
        }
    });
    
    // CERRAR menú al hacer clic en un enlace
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                mainNav.classList.remove('active');
                mobileMenuBtn.querySelector('i').classList.remove('fa-times');
                mobileMenuBtn.querySelector('i').classList.add('fa-bars');
                document.body.style.overflow = '';
            }
            
            // Actualizar enlace activo
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // CERRAR menú al hacer clic fuera (solo en móvil)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && 
            mainNav.classList.contains('active') &&
            !mainNav.contains(e.target) && 
            e.target !== mobileMenuBtn &&
            !mobileMenuBtn.contains(e.target)) {
            
            mainNav.classList.remove('active');
            mobileMenuBtn.querySelector('i').classList.remove('fa-times');
            mobileMenuBtn.querySelector('i').classList.add('fa-bars');
            document.body.style.overflow = '';
        }
    });
    
    // Smooth scroll para enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Actualizar al cambiar tamaño de ventana
    window.addEventListener('resize', updateMenuVisibility);
    
    // También actualizar al cargar la página completamente
    window.addEventListener('load', updateMenuVisibility);
}

// ===== CUENTA REGRESIVA ANIMADA =====
function initCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const now = new Date().getTime();
    const timeLeft = CAMP_START_DATE.getTime() - now;
    
    if (timeLeft < 0) {
        updateCountdownUI(0, 0, 0, 0);
        updateCountdownMessage("¡La aventura ha comenzado!");
        return;
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    updateCountdownUI(days, hours, minutes, seconds);
}

function updateCountdownUI(days, hours, minutes, seconds) {
    const daysEl = document.getElementById('countdownDays');
    const hoursEl = document.getElementById('countdownHours');
    const minutesEl = document.getElementById('countdownMinutes');
    const secondsEl = document.getElementById('countdownSeconds');
    
    if (daysEl) daysEl.textContent = days.toString().padStart(3, '0');
    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
    if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
    if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    
    if (secondsEl) {
        secondsEl.classList.add('changing');
        setTimeout(() => {
            secondsEl.classList.remove('changing');
        }, 500);
    }
}

function updateCountdownMessage(message) {
    const countdownHeader = document.querySelector('.countdown-header p');
    if (countdownHeader) {
        countdownHeader.textContent = message;
    }
}

// ===== SISTEMA DE FORMULARIO =====
function initForm() {
    const form = document.getElementById('campForm');
    if (!form) return;
    
    form.addEventListener('submit', handleFormSubmit);
    
    initFormValidation();
    
    // Lógica para checkbox de salud
    const healthCheckboxes = document.querySelectorAll('input[name="health"]');
    const noneHealthCheckbox = document.querySelector('input[name="health"][value="Ninguna"]');
    
    if (noneHealthCheckbox && healthCheckboxes.length > 0) {
        healthCheckboxes.forEach(checkbox => {
            if (checkbox !== noneHealthCheckbox) {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        noneHealthCheckbox.checked = false;
                    }
                });
            }
        });
        
        noneHealthCheckbox.addEventListener('change', function() {
            if (this.checked) {
                healthCheckboxes.forEach(cb => {
                    if (cb !== noneHealthCheckbox) cb.checked = false;
                });
            }
        });
    }
    
    // Lógica para checkbox de dieta
    const dietCheckboxes = document.querySelectorAll('input[name="diet"]');
    const noneDietCheckbox = document.querySelector('input[name="diet"][value="Ninguna"]');
    
    if (noneDietCheckbox && dietCheckboxes.length > 0) {
        dietCheckboxes.forEach(checkbox => {
            if (checkbox !== noneDietCheckbox) {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        noneDietCheckbox.checked = false;
                    }
                });
            }
        });
        
        noneDietCheckbox.addEventListener('change', function() {
            if (this.checked) {
                dietCheckboxes.forEach(cb => {
                    if (cb !== noneDietCheckbox) cb.checked = false;
                });
            }
        });
    }
}

function initFormValidation() {
    const form = document.getElementById('campForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearError);
    });
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    clearError({ target: field });
    
    switch (field.id) {
        case 'fullName':
            if (value.length < 3) {
                isValid = false;
                errorMessage = '¡Necesitamos saber tu nombre de aventurero! (al menos 3 letras)';
            }
            break;
            
        case 'age':
            const age = parseInt(value);
            if (isNaN(age) || age < 8 || age > 17) {
                isValid = false;
                errorMessage = 'La edad debe ser entre 8 y 17 años para esta misión';
            }
            break;
            
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = '¡Ups! Eso no parece un correo electrónico válido';
            }
            break;
            
        case 'phone':
            const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Necesitamos un número de teléfono real para emergencias';
            }
            break;
            
        case 'emergencyContact':
            if (value.length < 5) {
                isValid = false;
                errorMessage = 'Por favor, dinos quién es tu contacto de emergencia';
            }
            break;
    }
    
    if (!isValid) {
        showError(field, errorMessage);
    }
    
    return isValid;
}

function showError(field, message) {
    field.classList.add('error');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        color: #F56565;
        font-size: 0.85rem;
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        background-color: #FFF5F5;
        padding: 8px 12px;
        border-radius: 6px;
        border-left: 4px solid #F56565;
    `;
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    
    field.parentNode.appendChild(errorDiv);
}

function clearError(e) {
    const field = e.target;
    field.classList.remove('error');
    
    const errorMessage = field.parentNode.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // 1. DESHABILITAR BOTÓN
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    submitBtn.disabled = true;
    
    // 2. RECOGER DATOS (hacerlo ANTES del try para que esté disponible en catch)
    const formData = new FormData(form);
    const applicant = {};
    
    for (let [key, value] of formData.entries()) {
        if (key === 'health' || key === 'diet') {
            if (!applicant[key]) applicant[key] = [];
            applicant[key].push(value);
        } else {
            applicant[key] = value.trim();
        }
    }
    
    // 3. VALIDAR DATOS BÁSICOS
    if (!applicant.fullName || applicant.fullName.length < 3) {
        showNotification('⚠️ El nombre debe tener al menos 3 caracteres', 'error');
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
        return;
    }
    
    if (!applicant.phone || applicant.phone.length < 8) {
        showNotification('⚠️ Teléfono inválido', 'error');
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
        return;
    }
    
    try {
        console.log('📤 Enviando a Render...', applicant);
        
        // 4. ENVIAR A RENDER
        const response = await fetch(`${RENDER_BACKEND_URL}/api/inscribir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(applicant),
            timeout: 10000 // 10 segundos máximo
        });
        
        // 5. VERIFICAR SI LA RESPUESTA ES OK
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 6. MANEJAR RESPUESTA DE RENDER
        if (result.success) {
            console.log('✅ Respuesta de Render:', result);
            
            // Crear objeto completo para guardar
            const applicantToSave = {
                ...result.data,
                localBackup: true,
                syncedAt: new Date().toISOString()
            };
            
            // Guardar localmente como backup
            applicants.push(applicantToSave);
            applicantCount = applicants.length;
            saveApplicantsToStorage();
            
            // Actualizar UI
            updateApplicantCounter();
            updateAvailableSpots();
            
            // Mostrar confirmación
            showConfirmationModal(applicantToSave);
            form.reset();
            
            // Notificación
            showNotification('✅ ¡Inscripción guardada en el servidor!', 'success');
            
        } else {
            // Error específico de Render (duplicado, validación, etc.)
            console.warn('⚠️ Error de Render:', result.error);
            showNotification(`⚠️ ${result.error}`, 'warning');
            
            // Intentar guardar localmente como fallback
            await saveLocally(applicant, form);
        }
        
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        
        // Diferentes tipos de errores
        let errorMessage = 'Error al enviar la inscripción';
        
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            errorMessage = '⚠️ Sin conexión a internet';
        } else if (error.name === 'AbortError') {
            errorMessage = '⚠️ Tiempo de espera agotado';
        }
        
        showNotification(`${errorMessage} - Guardando localmente`, 'warning');
        
        // Guardar localmente como último recurso
        await saveLocally(applicant, form);
        
    } finally {
        // 7. SIEMPRE RESTAURAR BOTÓN
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// ===== FUNCIÓN saveLocally MEJORADA =====
async function saveLocally(applicantData, formElement) {
    try {
        const applicantId = Date.now();
        const registrationNumber = `AVENT-${String(applicantId).slice(-6)}`;
        
        const applicantToSave = {
            ...applicantData,
            id: applicantId,
            registrationDate: new Date().toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            status: 'Pendiente (local)',
            registrationNumber: registrationNumber,
            savedLocally: true,
            savedAt: new Date().toISOString()
        };
        
        // Verificar duplicado local
        const isDuplicate = applicants.some(existing => 
            existing.fullName === applicantToSave.fullName && 
            existing.phone === applicantToSave.phone
        );
        
        if (isDuplicate) {
            showNotification('⚠️ Ya existe una inscripción local con estos datos', 'warning');
            return false;
        }
        
        // Guardar
        applicants.push(applicantToSave);
        applicantCount = applicants.length;
        
        saveApplicantsToStorage();
        updateApplicantCounter();
        updateAvailableSpots();
        
        // Mostrar confirmación si no hay una activa
        setTimeout(() => {
            showConfirmationModal(applicantToSave);
        }, 500);
        
        // Resetear formulario
        if (formElement) formElement.reset();
        
        showNotification('✅ Inscripción guardada localmente', 'success');
        
        if (isAdminAuthenticated) {
            updateAdminStats();
            updateRecentApplicants();
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error guardando localmente:', error);
        showNotification('Error al guardar localmente', 'error');
        return false;
    }
}

// ===== ALMACENAMIENTO LOCAL =====
async function loadApplicantsFromStorage() {
    // Limpiar datos al inicio
    applicants = [];
    applicantCount = 0;
    
    // 1. Primero cargar desde localStorage
    const storedApplicants = localStorage.getItem('iamApplicants');
    let localData = [];
    
    if (storedApplicants) {
        try {
            localData = JSON.parse(storedApplicants);
            console.log(`📊 Cargados ${localData.length} aventureros desde localStorage`);
        } catch (error) {
            console.error('Error cargando datos locales:', error);
        }
    }
    
    // 2. Verificar con Firebase pero manejar errores de cuota
    if (window.backendManager && window.backendManager.getAllApplicants) {
        try {
            console.log("🔄 Intentando sincronizar con Firebase...");
            const firebaseResult = await window.backendManager.getAllApplicants();
            
            if (firebaseResult.success && firebaseResult.data && firebaseResult.data.length > 0) {
                // EVITAR DUPLICADOS: Usar un Set para IDs únicos
                const uniqueApplicants = new Map();
                
                // Primero agregar de Firebase
                firebaseResult.data.forEach(app => {
                    if (app.id) {
                        uniqueApplicants.set(app.id, app);
                    }
                });
                
                // Luego agregar locales (no duplicar)
                localData.forEach(app => {
                    if (app.id && !uniqueApplicants.has(app.id)) {
                        uniqueApplicants.set(app.id, app);
                    } else if (!app.id && app.registrationNumber) {
                        // Usar registrationNumber como fallback
                        const key = `local-${app.registrationNumber}`;
                        if (!uniqueApplicants.has(key)) {
                            uniqueApplicants.set(key, app);
                        }
                    }
                });
                
                // Convertir de vuelta a array
                applicants = Array.from(uniqueApplicants.values());
                applicantCount = applicants.length;
                
                console.log(`✅ Datos combinados: ${applicantCount} aventureros únicos`);
                
                // Guardar en localStorage
                localStorage.setItem('iamApplicants', JSON.stringify(applicants));
            } else {
                // Si Firebase falla, usar solo localStorage
                applicants = localData;
                applicantCount = applicants.length;
                console.log("⚠️ Usando solo datos locales");
            }
        } catch (error) {
            console.warn("⚠️ Error de Firebase, usando localStorage:", error.message);
            
            // Usar solo localStorage si Firebase falla
            applicants = localData;
            applicantCount = applicants.length;
            
            // Mostrar advertencia solo si es error de cuota
            if (error.message && (error.message.includes('quota') || error.message.includes('Quota'))) {
                console.warn("⚠️ Firebase superó la cuota. Usando modo offline.");
            }
        }
    } else {
        // Fallback completo a localStorage
        applicants = localData;
        applicantCount = applicants.length;
    }
}

function saveApplicantsToStorage() {
    // Remover duplicados antes de guardar
    const uniqueApplicants = applicants.filter((app, index, self) =>
        index === self.findIndex(a => 
            a.id === app.id || 
            (a.registrationNumber === app.registrationNumber && a.registrationNumber)
        )
    );
    
    applicants = uniqueApplicants;
    applicantCount = applicants.length;
    
    localStorage.setItem('iamApplicants', JSON.stringify(applicants));
    console.log(`💾 Guardados ${applicants.length} aventureros únicos`);
}

function updateApplicantCounter() {
    const counterElement = document.getElementById('applicantCount');
    if (counterElement) {
        counterElement.textContent = applicantCount;
    }
    
    const adminTotalCount = document.getElementById('adminTotalCount');
    if (adminTotalCount && isAdminAuthenticated) {
        adminTotalCount.textContent = applicantCount;
    }
}

function updateAvailableSpots() {
    const availableSpots = Math.max(0, MAX_SPOTS - applicantCount);
    const filledPercentage = (applicantCount / MAX_SPOTS) * 100;
    
    const spotsElement = document.getElementById('availableSpots');
    const progressBar = document.getElementById('spotsProgressBar');
    
    if (spotsElement) {
        spotsElement.textContent = availableSpots;
        
        if (availableSpots <= 10) {
            spotsElement.style.color = '#F56565';
            spotsElement.style.fontWeight = '600';
        } else {
            spotsElement.style.color = '';
            spotsElement.style.fontWeight = '';
        }
    }
    
    if (progressBar) {
        progressBar.style.width = `${filledPercentage}%`;
        
        // Cambiar color según disponibilidad
        if (availableSpots <= 10) {
            progressBar.style.background = 'linear-gradient(to right, #FF9800, #F56565)';
        } else if (availableSpots <= 30) {
            progressBar.style.background = 'linear-gradient(to right, #FFB347, #FFCC80)';
        } else {
            progressBar.style.background = 'linear-gradient(to right, #38B2AC, #4FD1C5)';
        }
    }
}

// ===== FUNCIÓN PARA LIMPIAR DUPLICADOS =====
function removeDuplicateApplicants() {
    if (applicants.length === 0) return;
    
    const uniqueMap = new Map();
    const duplicates = [];
    
    applicants.forEach(applicant => {
        // Crear una clave única combinando varios campos
        const key = `${applicant.fullName || ''}-${applicant.phone || ''}-${applicant.age || ''}-${applicant.registrationNumber || ''}`;
        
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, applicant);
        } else {
            duplicates.push(applicant);
        }
    });
    
    if (duplicates.length > 0) {
        console.log(`🔄 Eliminando ${duplicates.length} duplicados...`);
        const beforeCount = applicantCount;
        applicants = Array.from(uniqueMap.values());
        applicantCount = applicants.length;
        
        // Guardar en localStorage
        localStorage.setItem('iamApplicants', JSON.stringify(applicants));
        
        // Actualizar UI
        updateApplicantCounter();
        updateAvailableSpots();
        
        if (isAdminAuthenticated) {
            updateAdminStats();
            updateRecentApplicants();
        }
        
        console.log(`✅ Quedan ${applicantCount} aventureros únicos (eliminados ${beforeCount - applicantCount})`);
        
        return duplicates.length;
    }
    
    return 0;
}

// ===== GALERÍA INTERACTIVA =====
function initGallery() {
    // Configurar clics para cada galería especial
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    // Juegos y Actividades
    if (galleryItems[0]) {
        galleryItems[0].addEventListener('click', () => openGamesGallery());
    }
    
    // Vida Sacramental
    if (galleryItems[1]) {
        galleryItems[1].addEventListener('click', () => openFaithGallery());
    }
    
    // Talleres y Formación
    if (galleryItems[2]) {
        galleryItems[2].addEventListener('click', () => openWorkshopsGallery());
    }
    
    // Convivencia Cristiana
    if (galleryItems[3]) {
        galleryItems[3].addEventListener('click', () => openCommunityGallery());
    }
}

// ===== 4 GALERÍAS ESPECIALES CON ICONOS FONTAWESOME =====

// 1. GALERÍA DE JUEGOS Y ACTIVIDADES
function openGamesGallery() {
    const gamesPhotos = [
        {
            url: 'img/juegos-1.jpg',
            title: 'Juegos en Equipo',
            desc: 'Competencias divertidas que fomentan el trabajo en grupo'
        },
        {
            url: 'img/juegos-2.jpg',
            title: 'Carreras de Obstáculos',
            desc: 'Desafíos físicos para los aventureros más valientes'
        },
        {
            url: 'img/juegos-3.jpg',
            title: 'Captura la Bandera',
            desc: '¡Cada grupo con la bandera de los continentes!'
        },
        {
            url: 'img/juegos-6.jpg',
            title: 'Deportes al Aire Libre',
            desc: 'Fútbol, vóley y mucho más'
        },
        {
            url: 'img/juegos-5.jpg',
            title: 'Retos de Agilidad',
            desc: 'Coordinación y velocidad en acción'
        },
        {
            url: 'img/juegos-4.jpg',
            title: 'Deportes',
            desc: '¡Perfectos para divertirse!'
        }
    ];
    
    openGalleryModal('games', gamesPhotos, 'Juegos y Actividades', 'fa-gamepad');
}

// 2. GALERÍA DE VIDA SACRAMENTAL
function openFaithGallery() {
    const faithPhotos = [
        {
            url: 'img/Misa-3.jpg',
            title: 'Santa Misa Comunitaria',
            desc: 'Celebrando la Eucaristía todos juntos en el campamento'
        },
        {
            url: 'img/Adoracion-1.jpg',
            title: 'Adoración Eucarística',
            desc: 'Momento de oración silenciosa ante Jesús Sacramentado'
        },
        {
            url: 'img/Rezo-1.jpg',
            title: 'Rosario Comunitario',
            desc: 'Rezando con María como familia misionera'
        },
        {
            url: 'img/Misa-2.jpg',
            title: 'Sacramento de la Reconciliación',
            desc: 'Encuentro con la misericordia de Dios'
        },
        {
            url: 'img/Formacion-1.jpg',
            title: 'Lectio Divina',
            desc: 'Meditando la Palabra de Dios en grupo'
        },
        {
            url: 'img/Misa-1.jpg',
            title: 'Bendiciones Finales',
            desc: 'Enviados con la bendición para ser misioneros'
        }
    ];
    
    openGalleryModal('faith', faithPhotos, 'Vida Sacramental', 'fa-church');
}

// 3. GALERÍA DE TALLERES Y FORMACIÓN
function openWorkshopsGallery() {
    const workshopsPhotos = [
        {
            url: 'img/Formacion-2.jpg',
            title: 'Charlas Misioneras',
            desc: 'Aprendiendo sobre nuestra vocación de ser misioneros'
        },
        {
            url: 'img/Formacion-3.jpg',
            title: 'Formación en Valores',
            desc: 'Creciendo en virtudes cristianas'
        },
        {
            url: 'img/Formacion-4.jpg',
            title: 'Testimonios de Fe',
            desc: 'Compartiendo experiencias de encuentro con Jesús'
        },
        {
            url: 'img/Formacion-5.jpg',
            title: 'Grupos de Discusión',
            desc: 'Reflexionando juntos sobre la fe'
        },
        {
            url: 'img/Formacion-6.jpg',
            title: 'Oración Guiada',
            desc: 'Aprendiendo diferentes formas de orar'
        },
        {
            url: 'img/Formacion-7.jpg',
            title: 'Trabajos en Grupos',
            desc: 'Desarrollando actividades misioneras juntos'
        }
    ];
    
    openGalleryModal('workshops', workshopsPhotos, 'Formación', 'fa-comments');
}

// 4. GALERÍA DE CONVIVENCIA CRISTIANA
function openCommunityGallery() {
    const communityPhotos = [
        {
            url: 'img/Fogata-1.jpg',
            title: 'Fogon',
            desc: 'Momento de cantos y juegos alrededor del fuego'
        },
        {
            url: 'img/Convivencia-1.jpg',
            title: 'Comidas en Comunidad',
            desc: 'Compartiendo los alimentos como familia'
        },
        {
            url: 'img/Convivencia-2.jpg',
            title: 'Juegos y Actividades en Equipo',
            desc: 'Dividiendo los equipos por el color de cada continente'
        },
        {
            url: 'img/Convivencia-3.jpg',
            title: 'Decorando el Campamento Misionero',
            desc: 'Reflejando nuestra identidad misionera en cada rincón'
        },
        {
            url: 'img/Convivencia-4.jpg',
            title: 'Cuentos y Diarios',
            desc: 'Actividades para reflejar lo vivido cada día'
        },
        {
            url: 'img/Convivencia-5.jpg',
            title: 'Actividades de Servicio',
            desc: 'Aprendiendo a servir como Jesús nos enseñó'
        }
    ];
    
    openGalleryModal('community', communityPhotos, 'Convivencia Cristiana', 'fa-users');
}

// FUNCIÓN GENERAL PARA CREAR GALERÍAS CON ICONOS
function openGalleryModal(galleryType, photos, title, iconClass) {
    // Cerrar modal existente si hay uno
    const existingModal = document.querySelector('.gallery-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal gallery-modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '2000';
    
    // Determinar color según tipo de galería
    let headerColor;
    switch(galleryType) {
        case 'games':
            headerColor = 'linear-gradient(135deg, var(--primary), #4A8FD9)';
            break;
        case 'faith':
            headerColor = 'linear-gradient(135deg, #9C27B0, #BA68C8)'; // Púrpura
            break;
        case 'workshops':
            headerColor = 'linear-gradient(135deg, var(--accent), #FF9EB5)';
            break;
        case 'community':
            headerColor = 'linear-gradient(135deg, var(--secondary), #FFCC80)';
            break;
        default:
            headerColor = 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
    }
    
    // Generar HTML para todas las miniaturas
    const thumbnailsHTML = photos.map((photo, index) => `
        <div class="gallery-thumbnail ${index === 0 ? 'active' : ''}" 
             onclick="changeGalleryPhoto('${galleryType}', ${index})">
            <img src="${photo.url}" alt="${photo.title}" loading="lazy">
            <div class="thumbnail-overlay">
                <span>${index + 1}</span>
            </div>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-content gallery-modal-content">
            <button class="modal-close gallery-close" onclick="this.closest('.modal').remove()">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="gallery-header" style="background: ${headerColor}">
                <h3><i class="fas ${iconClass}"></i> ${title}</h3>
                <p>${photos.length} fotos - Haz clic en las miniaturas para navegar</p>
            </div>
            
            <div class="gallery-main">
                <div class="gallery-main-image-container">
                    <img id="mainGalleryPhoto" 
                         src="${photos[0].url}" 
                         alt="${photos[0].title}"
                         class="gallery-main-photo">
                    <div class="gallery-caption">
                        <h4 id="mainGalleryTitle">${photos[0].title}</h4>
                        <p id="mainGalleryDesc">${photos[0].desc}</p>
                        <div class="photo-counter">
                            <span id="currentPhoto">1</span> / ${photos.length}
                        </div>
                    </div>
                </div>
                
                <div class="gallery-controls">
                    <button class="gallery-btn prev-btn" onclick="changeGalleryPhoto('${galleryType}', -1)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="gallery-btn next-btn" onclick="changeGalleryPhoto('${galleryType}', 1)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            
            <div class="gallery-thumbnails-container">
                <div class="gallery-thumbnails">
                    ${thumbnailsHTML}
                </div>
            </div>
            
            <div class="gallery-footer">
                <p><i class="fas fa-mouse-pointer"></i> Haz clic en las miniaturas</p>
                <p><i class="fas fa-arrows-alt-h"></i> Usa las flechas para navegar</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Guardar datos de la galería actual
    window.currentGallery = {
        type: galleryType,
        photos: photos,
        currentIndex: 0
    };
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
            window.currentGallery = null;
        }
    });
    
    // Agregar navegación con teclado
    document.addEventListener('keydown', handleGalleryKeyboard);
}

// FUNCIÓN PARA CAMBIAR FOTO EN LA GALERÍA
function changeGalleryPhoto(galleryType, directionOrIndex) {
    if (!window.currentGallery || window.currentGallery.type !== galleryType) {
        console.error('Galería no encontrada');
        return;
    }
    
    const gallery = window.currentGallery;
    const totalPhotos = gallery.photos.length;
    let newIndex;
    
    // Determinar nuevo índice
    if (typeof directionOrIndex === 'number') {
        if (directionOrIndex === -1 || directionOrIndex === 1) {
            // Navegación con flechas
            newIndex = gallery.currentIndex + directionOrIndex;
            if (newIndex < 0) newIndex = totalPhotos - 1;
            if (newIndex >= totalPhotos) newIndex = 0;
        } else {
            // Navegación directa por índice
            newIndex = directionOrIndex;
        }
    } else {
        console.error('Dirección o índice inválido');
        return;
    }
    
    // Actualizar índice
    gallery.currentIndex = newIndex;
    const photo = gallery.photos[newIndex];
    
    // Actualizar foto principal
    const mainImg = document.getElementById('mainGalleryPhoto');
    const mainTitle = document.getElementById('mainGalleryTitle');
    const mainDesc = document.getElementById('mainGalleryDesc');
    const currentCounter = document.getElementById('currentPhoto');
    
    if (mainImg) {
        // Efecto de fade
        mainImg.style.opacity = '0';
        setTimeout(() => {
            mainImg.src = photo.url;
            mainImg.alt = photo.title;
            mainImg.style.opacity = '1';
        }, 200);
    }
    
    if (mainTitle) mainTitle.textContent = photo.title;
    if (mainDesc) mainDesc.textContent = photo.desc;
    if (currentCounter) currentCounter.textContent = newIndex + 1;
    
    // Actualizar miniaturas activas
    const thumbnails = document.querySelectorAll('.gallery-thumbnail');
    thumbnails.forEach((thumb, i) => {
        thumb.classList.remove('active');
        if (i === newIndex) {
            thumb.classList.add('active');
            // Scroll automático a la miniatura activa
            thumb.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    });
}

// MANEJADOR DE TECLADO PARA GALERÍAS
function handleGalleryKeyboard(e) {
    if (!window.currentGallery) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            changeGalleryPhoto(window.currentGallery.type, -1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            changeGalleryPhoto(window.currentGallery.type, 1);
            break;
        case 'Escape':
            e.preventDefault();
            const modal = document.querySelector('.gallery-modal');
            if (modal) {
                modal.remove();
                window.currentGallery = null;
                document.removeEventListener('keydown', handleGalleryKeyboard);
            }
            break;
    }
}

// ===== MODALES =====
function initModals() {
    const confirmationModal = document.getElementById('confirmationModal');
    const closeConfirmation = document.getElementById('closeConfirmation');
    
    if (closeConfirmation) {
        closeConfirmation.addEventListener('click', function() {
            if (confirmationModal) confirmationModal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', function(e) {
        if (confirmationModal && e.target === confirmationModal) {
            confirmationModal.style.display = 'none';
        }
    });
}

function showConfirmationModal(applicant) {
    const modal = document.getElementById('confirmationModal');
    const message = document.getElementById('confirmationMessage');
    const confirmName = document.getElementById('confirmName');
    const confirmId = document.getElementById('confirmId');
    
    if (message) {
        message.textContent = `¡Felicidades ${applicant.fullName}! Tu misión de aventura IAM 2026 ha sido registrada.`;
    }
    
    if (confirmName) confirmName.textContent = applicant.fullName;
    if (confirmId) confirmId.textContent = applicant.registrationNumber;
    
    if (modal) modal.style.display = 'flex';
    
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ===== SISTEMA DE ADMINISTRACIÓN - ACTUALIZADO PARA FIREBASE =====
function initAdminSystem() {
    const adminAccessBtn = document.getElementById('adminAccessBtn');
    const loginModal = document.getElementById('loginModal');
    const adminModal = document.getElementById('adminModal');
    const loginForm = document.getElementById('loginForm');
    const cancelLogin = document.getElementById('cancelLogin');
    const closeAdmin = document.getElementById('closeAdmin');
    
    console.log("🔧 Inicializando sistema admin...");
    
    if (!adminAccessBtn || !loginModal || !adminModal) {
        console.error("❌ Elementos críticos no encontrados");
        return;
    }
    
    // Verificar si ya hay admin autenticado desde localStorage
    if (window.backendManager && window.backendManager.isIamAdminAuthenticated) {
        const isLoggedIn = window.backendManager.isIamAdminAuthenticated();
        if (isLoggedIn) {
            isAdminAuthenticated = true;
            console.log("✅ Admin ya autenticado desde sesión previa");
        }
    }
    
    // === 1. BOTÓN DE ACCESO ADMIN ===
    adminAccessBtn.onclick = function() {
        if (isAdminAuthenticated) {
            showAdminPanel();
        } else {
            loginModal.style.display = 'flex';
        }
    };
    
    // === 2. FORMULARIO DE LOGIN - ACTUALIZADO PARA FIREBASE ===
    if (loginForm) {
        loginForm.onsubmit = async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const adminCode = document.getElementById('adminCode').value;
            
            console.log("🔐 Intentando login con Firebase...");
            
            // Verificar código secreto
            if (adminCode !== adminPassword) {
                showNotification('❌ Código secreto incorrecto', 'error');
                return false;
            }
            
            // Crear email para Firebase (si solo es username, agregar dominio)
            const email = username.includes('@') ? username : `${username}@iam.com`;
            
            try {
                // Usar el backendManager para login
                if (window.backendManager && window.backendManager.loginIamAdmin) {
                    const loginResult = await window.backendManager.loginIamAdmin(email, password, adminCode);
                    
                    if (loginResult.success) {
                        isAdminAuthenticated = true;
                        loginModal.style.display = 'none';
                        showAdminPanel();
                        showNotification('✅ ¡Acceso concedido al Cuartel General!', 'success');
                        loginForm.reset();
                        console.log("✅ Admin autenticado:", email);
                    } else {
                        showNotification('❌ ' + loginResult.error, 'error');
                    }
                } else {
                    // Fallback al sistema antiguo si backendManager no está disponible
                    const user = adminUsers.find(u => 
                        u.username === username && u.password === password
                    );
                    
                    if (user) {
                        isAdminAuthenticated = true;
                        loginModal.style.display = 'none';
                        showAdminPanel();
                        showNotification('✅ ¡Acceso concedido! (modo local)', 'success');
                        loginForm.reset();
                        console.log("✅ Usuario autenticado en modo local:", username);
                    } else {
                        showNotification('❌ Usuario o contraseña incorrectos', 'error');
                    }
                }
            } catch (error) {
                console.error("Error en login:", error);
                showNotification('❌ Error de conexión', 'error');
            }
            
            return false;
        };
    }
    
    // === 3. BOTÓN CANCELAR LOGIN (X DEL MODAL DE LOGIN) ===
    if (cancelLogin) {
        console.log("✅ Botón cancelLogin encontrado");
        
        // AGREGAR EVENTO DIRECTO
        cancelLogin.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("❌ Cerrando modal de login");
            loginModal.style.display = 'none';
            if (loginForm) loginForm.reset();
            return false;
        };
        
        // TAMBIÉN AGREGAR EVENT LISTENER
        cancelLogin.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            loginModal.style.display = 'none';
            if (loginForm) loginForm.reset();
        }, { once: false });
    }
    
    // === 4. BOTÓN CERRAR PANEL ADMIN (X DEL PANEL) ===
    if (closeAdmin) {
        console.log("✅ Botón closeAdmin encontrado");
        
        // AGREGAR EVENTO DIRECTO
        closeAdmin.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("❌ Cerrando panel admin");
            adminModal.style.display = 'none';
            return false;
        };
        
        // TAMBIÉN AGREGAR EVENT LISTENER
        closeAdmin.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            adminModal.style.display = 'none';
        }, { once: false });
    }
    
    // === 5. CERRAR MODALES AL HACER CLIC FUERA ===
    loginModal.onclick = function(e) {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
            if (loginForm) loginForm.reset();
        }
    };
    
    adminModal.onclick = function(e) {
        if (e.target === adminModal) {
            adminModal.style.display = 'none';
        }
    };
    
    // === 6. PREVENIR QUE EL CLIC DENTRO DEL MODAL LO CIERRE ===
    const loginContent = loginModal.querySelector('.modal-content');
    const adminContent = adminModal.querySelector('.modal-content');
    
    if (loginContent) {
        loginContent.onclick = function(e) {
            e.stopPropagation();
        };
    }
    
    if (adminContent) {
        adminContent.onclick = function(e) {
            e.stopPropagation();
        };
    }
    
    initAdminButtons();
}

function authenticateAdmin(username, password, code) {
    // Verificar código
    if (code !== adminPassword) {
        console.log('❌ Código incorrecto');
        return false;
    }
    
    // Verificar usuario y contraseña
    const user = adminUsers.find(u => 
        u.username === username && u.password === password
    );
    
    if (user) {
        console.log(`✅ Usuario autenticado: ${username}`);
        return true;
    }
    
    console.log('❌ Usuario o contraseña incorrectos');
    return false;
}

function showAdminPanel() {
    const adminModal = document.getElementById('adminModal');
    if (!adminModal) return;
    
    updateAdminStats();
    updateRecentApplicants();
    adminModal.style.display = 'flex';
}

async function updateAdminStats() {
    const adminTotalCount = document.getElementById('adminTotalCount');
    const adminAvgAge = document.getElementById('adminAvgAge');
    const adminMedicalCount = document.getElementById('adminMedicalCount');
    
    if (adminTotalCount) {
        adminTotalCount.textContent = applicantCount;
    }
    
    if (adminAvgAge) {
        if (applicants.length > 0) {
            const totalAge = applicants.reduce((sum, app) => sum + parseInt(app.age || 0), 0);
            const avgAge = (totalAge / applicants.length).toFixed(1);
            adminAvgAge.textContent = avgAge;
        } else {
            adminAvgAge.textContent = '0';
        }
    }
    
    if (adminMedicalCount) {
        const withMedicalConditions = applicants.filter(app => 
            app.health && !app.health.includes('Ninguna')
        ).length;
        adminMedicalCount.textContent = withMedicalConditions;
    }
}

async function updateRecentApplicants() {
    const container = document.getElementById('recentApplicants');
    if (!container) return;
    
    try {
        // Usar backendManager si está disponible
        if (window.backendManager && window.backendManager.getRecentApplicants) {
            const result = await window.backendManager.getRecentApplicants(5);
            
            if (result.success && result.data.length > 0) {
                const recentApplicants = result.data;
                
                container.innerHTML = recentApplicants.map(applicant => `
                    <div class="applicant-item">
                        <div class="applicant-info">
                            <h5>${applicant.fullName}</h5>
                            <p>${applicant.age} años • ${applicant.parish || 'Base secreta'}</p>
                        </div>
                        <div class="applicant-date">
                            ${applicant.registrationDate}
                        </div>
                    </div>
                `).join('');
                return;
            }
        }
        
        // Fallback al sistema local
        const recentApplicants = [...applicants]
            .sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate))
            .slice(0, 5);
        
        if (recentApplicants.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 30px; font-style: italic;">No hay nuevos reclutas todavía</p>';
            return;
        }
        
        container.innerHTML = recentApplicants.map(applicant => `
            <div class="applicant-item">
                <div class="applicant-info">
                    <h5>${applicant.fullName}</h5>
                    <p>${applicant.age} años • ${applicant.parish || 'Base secreta'}</p>
                </div>
                <div class="applicant-date">
                    ${applicant.registrationDate}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.warn("Error obteniendo inscritos recientes:", error);
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 30px; font-style: italic;">No hay nuevos reclutas todavía</p>';
    }
}

function initAdminButtons() {
    // Botón: Gestionar Inscritos
    const manageAllBtn = document.getElementById('manageAll');
    if (manageAllBtn) {
        manageAllBtn.addEventListener('click', function() {
            if (!isAdminAuthenticated) {
                showNotification('Acceso no autorizado al Cuartel General', 'error');
                return;
            }
            showAllApplicantsData();
        });
    }
    
    // Botón: Ver Todos
    const viewAllDataBtn = document.getElementById('viewAllData');
    if (viewAllDataBtn) {
        viewAllDataBtn.addEventListener('click', function() {
            if (!isAdminAuthenticated) {
                showNotification('Acceso no autorizado al Cuartel General', 'error');
                return;
            }
            showAllApplicantsData();
        });
    }
    
    // Botón: Exportar PDF
    const exportPDFBtn = document.getElementById('exportPDF');
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', function() {
            if (!isAdminAuthenticated) {
                showNotification('Acceso no autorizado al Cuartel General', 'error');
                return;
            }
            exportToPDF();
        });
    }
    
    // Botón: Exportar Excel
    const exportExcelBtn = document.getElementById('exportExcel');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function() {
            if (!isAdminAuthenticated) {
                showNotification('Acceso no autorizado al Cuartel General', 'error');
                return;
            }
            exportToExcel();
        });
    }
    
    // Botón: Limpiar Datos
    const clearDataBtn = document.getElementById('clearData');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', async function() {
            if (!isAdminAuthenticated) {
                showNotification('Acceso no autorizado al Cuartel General', 'error');
                return;
            }
            
            if (!confirm('⚠️ ¿Reiniciar toda la misión? Esto eliminará TODOS los datos de aventureros. ¡Esta acción no se puede deshacer!')) {
                return;
            }
            
            try {
                // Usar backendManager si está disponible
                if (window.backendManager && window.backendManager.clearAllData) {
                    const result = await window.backendManager.clearAllData();
                    
                    if (result.success) {
                        applicants = [];
                        applicantCount = 0;
                        
                        updateApplicantCounter();
                        updateAvailableSpots();
                        updateAdminStats();
                        updateRecentApplicants();
                        
                        showNotification('¡Misión reiniciada! Todos los datos han sido eliminados', 'warning');
                    } else {
                        showNotification('Error al limpiar datos: ' + result.error, 'error');
                    }
                } else {
                    // Fallback al sistema local
                    applicants = [];
                    applicantCount = 0;
                    
                    localStorage.removeItem('iamApplicants');
                    
                    updateApplicantCounter();
                    updateAvailableSpots();
                    updateAdminStats();
                    updateRecentApplicants();
                    
                    showNotification('¡Misión reiniciada! Todos los datos han sido eliminados', 'warning');
                }
            } catch (error) {
                showNotification('Error al limpiar datos', 'error');
            }
        });
    }
    
    // Botón: Limpiar Todos los Duplicados (en la sección de Nuevos Reclutas)
    const cleanAllDuplicatesBtn = document.getElementById('cleanAllDuplicates');
    if (cleanAllDuplicatesBtn) {
        cleanAllDuplicatesBtn.addEventListener('click', function() {
            if (!isAdminAuthenticated) {
                showNotification('Acceso no autorizado', 'error');
                return;
            }
            showDuplicateModal();
        });
    }
    
    // Botón: Limpiar Duplicados (en action-grid - el que añadimos antes)
    const cleanDuplicatesBtn = document.getElementById('cleanDuplicates');
    if (cleanDuplicatesBtn) {
        cleanDuplicatesBtn.addEventListener('click', function() {
            if (!isAdminAuthenticated) {
                showNotification('Acceso no autorizado', 'error');
                return;
            }
            showDuplicateModal();
        });
    }
}

// ===== FUNCIONES DE VISUALIZACIÓN Y EXPORTACIÓN =====
function showAllApplicantsData() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '2001';
    
    const applicantsHTML = applicants.map((app, index) => `
        <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td><strong>${app.fullName}</strong></td>
            <td style="text-align: center;">${app.age}</td>
            <td>${app.phone || '-'}</td>
            <td>${app.parish || '-'}</td>
            <td>${app.health ? app.health.filter(h => h !== 'Ninguna').join(', ') || 'Ninguna' : '-'}</td>
            <td>${app.diet ? app.diet.filter(d => d !== 'Ninguna').join(', ') || 'Ninguna' : '-'}</td>
            <td><code>${app.registrationNumber}</code></td>
            <td>${app.registrationDate.split(' ')[0]}</td>
        </tr>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1200px; max-height: 80vh; overflow-y: auto; padding: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h3 style="color: var(--primary); display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-users"></i> Todos los Aventureros (${applicants.length})
                </h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            ${applicants.length === 0 ? 
                '<p style="text-align: center; padding: 40px; color: var(--text-light); font-size: 1.1rem;">¡Todavía no hay aventureros en la misión!</p>' : 
                `
                <div style="overflow-x: auto; margin-bottom: 30px;">
                    <table style="width: 100%; border-collapse: collapse; min-width: 1000px;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: white;">
                                <th style="padding: 15px; text-align: left; border-radius: 8px 0 0 0;">#</th>
                                <th style="padding: 15px; text-align: left;">Aventurero</th>
                                <th style="padding: 15px; text-align: left;">Edad</th>
                                <th style="padding: 15px; text-align: left;">Comunicador</th>
                                <th style="padding: 15px; text-align: left;">Base</th>
                                <th style="padding: 15px; text-align: left;">Notas Médicas</th>
                                <th style="padding: 15px; text-align: left;">Preferencias</th>
                                <th style="padding: 15px; text-align: left;">Código</th>
                                <th style="padding: 15px; text-align: left; border-radius: 0 8px 0 0;">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${applicantsHTML}
                        </tbody>
                    </table>
                </div>
                `
            }
            
            <div style="display: flex; gap: 15px; justify-content: flex-end; flex-wrap: wrap;">
                <button onclick="exportToPDF()" class="btn" style="background: var(--primary); color: white;">
                    <i class="fas fa-file-pdf"></i> Crear Reporte PDF
                </button>
                <button onclick="exportToExcel()" class="btn" style="background: #217346; color: white;">
                    <i class="fas fa-file-excel"></i> Crear Reporte Excel
                </button>
                <button onclick="this.closest('.modal').remove()" class="btn" style="background: var(--text-light); color: white;">
                    Cerrar Vista
                </button>
            </div>
        </div>
    `;
    
    // Añadir estilos para la tabla
    const style = document.createElement('style');
    style.textContent = `
        .modal table tbody tr:nth-child(even) {
            background-color: var(--bg-light);
        }
        .modal table tbody tr:hover {
            background-color: #E6FFFA;
        }
        .modal table td {
            padding: 12px 15px;
            border-bottom: 1px solid #E2E8F0;
        }
        .modal code {
            background-color: #EDF2F7;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9rem;
            color: var(--primary);
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function exportToPDF() {
    if (applicants.length === 0) {
        showNotification('No hay datos de aventureros para exportar', 'warning');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        
        // Configuración
        const marginLeft = 15;
        const marginTop = 20;
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        // PORTADA
        doc.setFillColor(...PDF_COLORS.primary);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Logo
        doc.setFillColor(...PDF_COLORS.secondary);
        doc.circle(pageWidth / 2, 60, 35, 'F');
        doc.setFontSize(28);
        doc.setTextColor(255, 255, 255);
        doc.text('IAM', pageWidth / 2, 65, { align: 'center' });
        
        // Título
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('AVENTURA MISIONERA IAM 2026', pageWidth / 2, 100, { align: 'center' });
        
        // Subtítulo
        doc.setFontSize(16);
        doc.setTextColor(...PDF_COLORS.secondary);
        doc.text('Lista de Aventureros - Campamento', pageWidth / 2, 120, { align: 'center' });
        
        // Información
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text(`Total de aventureros: ${applicantCount}`, pageWidth / 2, 150, { align: 'center' });
        doc.text(`Plazas disponibles: ${MAX_SPOTS - applicantCount}`, pageWidth / 2, 160, { align: 'center' });
        doc.text(`Fecha del reporte: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 170, { align: 'center' });
        
        // Línea decorativa
        doc.setDrawColor(...PDF_COLORS.accent);
        doc.setLineWidth(2);
        doc.line(pageWidth / 2 - 80, 180, pageWidth / 2 + 80, 180);
        
        // Nota
        doc.setFontSize(10);
        doc.setTextColor(...PDF_COLORS.secondary);
        doc.text('Documento confidencial - Cuartel General de la Aventura', pageWidth / 2, 200, { align: 'center' });
        
        // TABLA DE DATOS
        doc.addPage();
        doc.setFillColor(...PDF_COLORS.light);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        doc.setFontSize(18);
        doc.setTextColor(...PDF_COLORS.dark);
        doc.text('LISTA DE AVENTUREROS IAM', marginLeft, marginTop);
        
        doc.setFontSize(10);
        doc.setTextColor(...PDF_COLORS.primary);
        doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth - marginLeft, marginTop, { align: 'right' });
        
        const headers = [
            ['#', 'Aventurero', 'Edad', 'Teléfono', 'Base', 'Notas Médicas', 'Preferencias', 'Código', 'Fecha']
        ];
        
        const data = applicants.map((app, index) => [
            index + 1,
            app.fullName,
            app.age,
            app.phone || '-',
            app.parish || '-',
            app.health ? app.health.filter(h => h !== 'Ninguna').join(', ') || 'Ninguna' : '-',
            app.diet ? app.diet.filter(d => d !== 'Ninguna').join(', ') || 'Ninguna' : '-',
            app.registrationNumber,
            app.registrationDate.split(' ')[0]
        ]);
        
        doc.autoTable({
            head: headers,
            body: data,
            startY: marginTop + 15,
            theme: 'grid',
            headStyles: {
                fillColor: PDF_COLORS.primary,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                textColor: PDF_COLORS.dark,
                fontSize: 9
            },
            alternateRowStyles: {
                fillColor: [240, 249, 255]
            },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center' },
                1: { cellWidth: 45 },
                2: { cellWidth: 22, halign: 'center' },
                3: { cellWidth: 35 },
                4: { cellWidth: 32 },
                5: { cellWidth: 38 },
                6: { cellWidth: 38 },
                7: { cellWidth: 35 },
                8: { cellWidth: 30 }
            },
            margin: { left: marginLeft, right: marginLeft },
            styles: {
                overflow: 'linebreak',
                cellPadding: 3
            },
            didDrawPage: function(data) {
                doc.setFontSize(8);
                doc.setTextColor(...PDF_COLORS.primary);
                const pageCount = doc.internal.getNumberOfPages();
                doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }
        });
        
        const fileName = `Aventura_IAM_${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(fileName);
        
        showNotification('Reporte PDF creado exitosamente', 'success');
    } catch (error) {
        console.error('Error generando PDF:', error);
        showNotification('Error al crear el reporte PDF', 'error');
    }
}

function exportToExcel() {
    if (applicants.length === 0) {
        showNotification('No hay datos de aventureros para exportar', 'warning');
        return;
    }
    
    try {
        const data = applicants.map((app, index) => ({
            'N°': index + 1,
            'Aventurero': app.fullName,
            'Edad': app.age,
            'Correo': app.email || '',
            'Teléfono': app.phone || '',
            'Base (Parroquia)': app.parish || '',
            'Notas Médicas': app.health ? app.health.filter(h => h !== 'Ninguna').join(', ') || 'Ninguna' : '',
            'Preferencias Alimentarias': app.diet ? app.diet.filter(d => d !== 'Ninguna').join(', ') || 'Ninguna' : '',
            'Contacto Emergencia': app.emergencyContact || '',
            'Código de Aventurero': app.registrationNumber,
            'Fecha de Inscripción': app.registrationDate,
            'Estado': app.status || 'Pendiente'
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Aventureros IAM");
        
        // Ajustar anchos de columnas
        const maxWidths = {};
        data.forEach(row => {
            Object.keys(row).forEach(key => {
                const length = String(row[key]).length;
                if (!maxWidths[key] || length > maxWidths[key]) {
                    maxWidths[key] = length;
                }
            });
        });
        
        worksheet['!cols'] = Object.keys(maxWidths).map(key => ({
            wch: Math.min(Math.max(maxWidths[key], key.length), 50)
        }));
        
        const fileName = `Aventura_IAM_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        showNotification('Reporte Excel creado exitosamente', 'success');
    } catch (error) {
        console.error('Error generando Excel:', error);
        showNotification('Error al crear el reporte Excel', 'error');
    }
}

// ===== NOTIFICACIONES =====
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    const backgroundColor = type === 'success' ? '#38B2AC' : 
                          type === 'error' ? '#F56565' : 
                          type === 'warning' ? '#ED8936' : '#2A6EBB';
    
    const borderColor = type === 'success' ? '#2C7A7B' : 
                       type === 'error' ? '#C53030' : 
                       type === 'warning' ? '#DD6B20' : '#2A6EBB';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        border: 2px solid ${borderColor};
        font-family: 'Nunito', sans-serif;
    `;
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Agregar estilos si no existen
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
            }
            .notification-content i {
                font-size: 1.2rem;
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                margin-left: 15px;
                opacity: 0.7;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .notification-close:hover {
                opacity: 1;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ===== ANIMACIONES DE SCROLL =====
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);
    
    // Observar elementos para animación
    document.querySelectorAll('.feature-card, .timeline-item, .gallery-item').forEach(el => {
        observer.observe(el);
    });
}

// ===== FUNCIONES ADICIONALES (UTILIDAD) =====
function generateSummaryReport() {
    if (applicants.length === 0) {
        return {
            total: 0,
            ageGroups: { '8-10': 0, '11-13': 0, '14-17': 0 },
            parishes: {},
            healthConditions: {},
            diets: {},
            availableSpots: MAX_SPOTS,
            filledPercentage: 0
        };
    }
    
    const ageGroups = { '8-10': 0, '11-13': 0, '14-17': 0 };
    const parishes = {};
    const healthConditions = {};
    const diets = {};
    
    applicants.forEach(app => {
        // Agrupar por edad
        const age = parseInt(app.age);
        if (age >= 8 && age <= 10) ageGroups['8-10']++;
        else if (age >= 11 && age <= 13) ageGroups['11-13']++;
        else if (age >= 14 && age <= 17) ageGroups['14-17']++;
        // Continuación desde donde se cortó en la función generateSummaryReport()

            // Agrupar por parroquia
            const parish = app.parish || 'No especificada';
            parishes[parish] = (parishes[parish] || 0) + 1;
            
            // Agrupar por condiciones de salud
            if (app.health) {
                app.health.forEach(cond => {
                    if (cond !== 'Ninguna') {
                        healthConditions[cond] = (healthConditions[cond] || 0) + 1;
                    }
                });
            }
            
            // Agrupar por restricciones alimentarias
            if (app.diet) {
                app.diet.forEach(diet => {
                    if (diet !== 'Ninguna') {
                        diets[diet] = (diets[diet] || 0) + 1;
                    }
                });
            }
        });
        
        return {
            total: applicantCount,
            ageGroups,
            parishes,
            healthConditions,
            diets,
            availableSpots: MAX_SPOTS - applicantCount,
            filledPercentage: ((applicantCount / MAX_SPOTS) * 100).toFixed(1)
        };
    }

    // ===== FUNCIÓN PARA ELIMINAR INSCRIPCIÓN INDIVIDUAL =====
function deleteApplicant(applicantId) {
    if (!isAdminAuthenticated) {
        showNotification('Acceso no autorizado', 'error');
        return;
    }
    
    if (!confirm('⚠️ ¿Eliminar esta inscripción? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const index = applicants.findIndex(app => app.id == applicantId);
    if (index !== -1) {
        // Eliminar de Firebase si está disponible
        if (window.backendManager && window.backendManager.firebaseAvailable) {
            // Aquí iría el código para eliminar de Firebase
            console.log(`🗑️ Intentando eliminar de Firebase: ${applicantId}`);
        }
        
        // Eliminar del array local
        applicants.splice(index, 1);
        applicantCount = applicants.length;
        
        // Actualizar localStorage
        localStorage.setItem('iamApplicants', JSON.stringify(applicants));
        
        // Actualizar UI
        updateApplicantCounter();
        updateAvailableSpots();
        updateRecentApplicants();
        updateAdminStats();
        
        showNotification('✅ Inscripción eliminada correctamente', 'success');
    }
}

// ===== FUNCIÓN PARA BUSCAR DUPLICADOS =====
function findDuplicateApplicants() {
    if (!applicants || applicants.length === 0) return [];
    
    const duplicates = [];
    const seen = {};
    
    applicants.forEach(applicant => {
        // Crear clave única combinando nombre y teléfono
        const key = `${applicant.fullName?.toLowerCase().trim()}_${applicant.phone?.replace(/\D/g, '')}`;
        
        if (key && key !== '_') { // Ignorar si no tiene datos
            if (seen[key]) {
                // Es duplicado
                if (!seen[key].marked) {
                    seen[key].marked = true;
                    duplicates.push(seen[key].applicant); // El primero también es duplicado
                }
                duplicates.push(applicant);
            } else {
                seen[key] = { applicant, marked: false };
            }
        }
    });
    
    return duplicates;
}

// ===== FUNCIÓN MEJORADA PARA ACTUALIZAR RECLUTAS =====
async function updateRecentApplicants() {
    const container = document.getElementById('recentApplicants');
    if (!container) return;
    
    try {
        // Obtener últimos 10 inscritos
        const recentApplicants = [...applicants]
            .sort((a, b) => (b.id || 0) - (a.id || 0)) // Ordenar por ID descendente
            .slice(0, 10);
        
        if (recentApplicants.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 30px; font-style: italic;">No hay nuevos reclutas todavía</p>';
            return;
        }
        
        // Crear HTML con botón de eliminar
        container.innerHTML = recentApplicants.map(applicant => {
            // Verificar si es duplicado
            const isDuplicate = isApplicantDuplicate(applicant);
            
            return `
                <div class="applicant-item ${isDuplicate ? 'duplicate-warning' : ''}" data-id="${applicant.id}">
                    <div class="applicant-info">
                        <h5>${applicant.fullName || 'Sin nombre'} 
                            ${isDuplicate ? '<span class="duplicate-badge">DUPLICADO</span>' : ''}
                        </h5>
                        <p>${applicant.age || '?'} años • ${applicant.parish || 'Sin parroquia'}</p>
                        <p style="font-size: 0.8rem; color: var(--text-light); margin-top: 5px;">
                            <i class="fas fa-phone"></i> ${applicant.phone || 'Sin teléfono'}
                        </p>
                    </div>
                    <div class="applicant-actions">
                        <div class="applicant-date">
                            ${applicant.registrationDate || 'Sin fecha'}
                        </div>
                        <button class="btn-delete-applicant" onclick="deleteApplicant(${applicant.id})" 
                                title="Eliminar inscripción">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Agregar estilos CSS si no existen
        addApplicantListStyles();
        
    } catch (error) {
        console.warn("Error actualizando reclutas:", error);
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 30px; font-style: italic;">Error cargando los datos</p>';
    }
}

// ===== FUNCIÓN PARA VERIFICAR SI ES DUPLICADO =====
function isApplicantDuplicate(applicant) {
    if (!applicant || !applicants) return false;
    
    const sameNamePhone = applicants.filter(app => 
        app.id !== applicant.id && 
        app.fullName === applicant.fullName && 
        app.phone === applicant.phone
    );
    
    return sameNamePhone.length > 0;
}

// ===== AGREGAR ESTILOS CSS =====
function addApplicantListStyles() {
    if (!document.getElementById('applicant-list-styles')) {
        const style = document.createElement('style');
        style.id = 'applicant-list-styles';
        style.textContent = `
            .applicant-item {
                background-color: var(--bg-light);
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-left: 4px solid var(--secondary);
                transition: all 0.3s ease;
            }
            
            .applicant-item:hover {
                background-color: #E6FFFA;
                transform: translateX(5px);
            }
            
            .applicant-info {
                flex: 1;
            }
            
            .applicant-info h5 {
                margin-bottom: 5px;
                color: var(--text-dark);
                font-size: 1rem;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .applicant-info p {
                color: var(--text-light);
                font-size: 0.9rem;
                margin: 2px 0;
            }
            
            .applicant-actions {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 8px;
                min-width: 120px;
            }
            
            .applicant-date {
                color: var(--text-light);
                font-size: 0.8rem;
                white-space: nowrap;
            }
            
            .btn-delete-applicant {
                background: #F56565;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 6px 12px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .btn-delete-applicant:hover {
                background: #C53030;
                transform: scale(1.05);
            }
            
            .duplicate-warning {
                background: #FFF5F5;
                border-left-color: #F56565 !important;
            }
            
            .duplicate-badge {
                background: #F56565;
                color: white;
                font-size: 0.7rem;
                padding: 2px 8px;
                border-radius: 10px;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }
}

// ===== MODAL PARA VER DUPLICADOS =====
function showDuplicateModal() {
    const duplicates = findDuplicateApplicants();
    
    if (duplicates.length === 0) {
        showNotification('✅ No se encontraron duplicados', 'info');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '2002';
    
    const duplicatesHTML = duplicates.map((app, index) => `
        <div class="applicant-item duplicate-warning">
            <div class="applicant-info">
                <h5>${app.fullName} <span class="duplicate-badge">DUPLICADO</span></h5>
                <p>${app.age} años • Tel: ${app.phone || 'No tiene'}</p>
                <p style="font-size: 0.8rem; color: var(--text-light);">
                    ${app.registrationNumber} • ${app.registrationDate}
                </p>
            </div>
            <div class="applicant-actions">
                <button class="btn-delete-applicant" onclick="deleteApplicant(${app.id})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: var(--warning); display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-exclamation-triangle"></i> Duplicados Encontrados (${duplicates.length})
                </h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            
            <div style="margin-bottom: 20px; padding: 15px; background: #FFF5F5; border-radius: 8px;">
                <p style="margin: 0; color: var(--text-dark);">
                    <i class="fas fa-info-circle"></i> Se encontraron ${duplicates.length} inscripciones duplicadas.
                    Puedes eliminarlas individualmente o todas juntas.
                </p>
            </div>
            
            <div style="margin-bottom: 30px;">
                ${duplicatesHTML}
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: flex-end;">
                <button onclick="removeAllDuplicates()" class="btn" style="background: var(--warning); color: white; padding: 10px 20px;">
                    <i class="fas fa-broom"></i> Eliminar Todos los Duplicados
                </button>
                <button onclick="this.closest('.modal').remove()" class="btn" style="background: var(--text-light); color: white; padding: 10px 20px;">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// ===== ELIMINAR TODOS LOS DUPLICADOS =====
function removeAllDuplicates() {
    if (!isAdminAuthenticated) {
        showNotification('Acceso no autorizado', 'error');
        return;
    }
    
    if (!confirm('⚠️ ¿Eliminar TODAS las inscripciones duplicadas?\n\nEsta acción eliminará todas las inscripciones que tengan el mismo nombre y teléfono. No se puede deshacer.')) {
        return;
    }
    
    const duplicates = findDuplicateApplicants();
    const uniqueIds = [...new Set(duplicates.map(d => d.id))];
    
    if (uniqueIds.length === 0) {
        showNotification('✅ No hay duplicados para eliminar', 'info');
        return;
    }
    
    // Eliminar cada duplicado
    uniqueIds.forEach(id => {
        const index = applicants.findIndex(app => app.id == id);
        if (index !== -1) {
            applicants.splice(index, 1);
        }
    });
    
    // Actualizar contador
    applicantCount = applicants.length;
    
    // Guardar cambios
    localStorage.setItem('iamApplicants', JSON.stringify(applicants));
    
    // Actualizar UI
    updateApplicantCounter();
    updateAvailableSpots();
    updateRecentApplicants();
    updateAdminStats();
    
    showNotification(`✅ Eliminados ${uniqueIds.length} inscripciones duplicadas`, 'success');
    
    // Cerrar modal
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

console.log("✅ Script de Campamento Misionero IAM cargado correctamente");

// ===== PARCHE DE SEGURIDAD PARA BOTONES DE CERRAR =====
setTimeout(function() {
    console.log("🛠️ Aplicando parche de seguridad para botones de cerrar");
    
    // Parche para botón cancelLogin (X del modal de login)
    const cancelLogin = document.getElementById('cancelLogin');
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');
    
    if (cancelLogin && loginModal) {
        // Agregar evento extra seguro
        cancelLogin.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("🛡️ Parche cancelLogin activado");
            loginModal.style.display = 'none';
            if (loginForm) loginForm.reset();
        }, true);
    }
    
    // Parche para botón closeAdmin (X del panel admin)
    const closeAdmin = document.getElementById('closeAdmin');
    const adminModal = document.getElementById('adminModal');
    
    if (closeAdmin && adminModal) {
        // Agregar evento extra seguro
        closeAdmin.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("🛡️ Parche closeAdmin activado");
            adminModal.style.display = 'none';
        }, true);
    }
    
    console.log("✅ Parche de seguridad aplicado");
}, 500);

// ===== DEBUG DE CARGA DE IMÁGENES =====
console.log("🔍 Verificando carga de recursos...");

// Verificar si las imágenes cargan
window.addEventListener('load', function() {
    console.log("✅ Página completamente cargada");
    
    // Verificar imágenes específicas
    const images = document.querySelectorAll('img');
    images.forEach((img, i) => {
        if (!img.complete) {
            console.warn(`⚠️ Imagen ${i} no cargada: ${img.src}`);
        }
    });
});

// ===== MEJORAS PARA MÓVIL =====
function initMobileEnhancements() {
    // Solo aplicar en dispositivos móviles
    if (window.innerWidth <= 768) {
        console.log("📱 Inicializando mejoras para móvil");
        
        // Suavizar scroll para la galería
        const galleryItems = document.querySelectorAll('.gallery-item');
        galleryItems.forEach(item => {
            item.style.cursor = 'pointer';
            item.style.webkitTapHighlightColor = 'transparent';
            
            // Prevenir doble clic en móvil
            let lastTap = 0;
            item.addEventListener('touchend', function(e) {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 500 && tapLength > 0) {
                    e.preventDefault();
                }
                lastTap = currentTime;
            });
        });
        
        // Mejorar experiencia táctil en la cuenta regresiva
        const countdownUnits = document.querySelectorAll('.countdown-unit');
        countdownUnits.forEach(unit => {
            unit.style.webkitTapHighlightColor = 'rgba(255, 255, 255, 0.1)';
        });
        
        // Ajustar altura automáticamente en iOS
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            document.documentElement.style.height = 'calc(100% + 60px)';
            
            // Arreglo para el viewport de iOS
            window.addEventListener('orientationchange', function() {
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 100);
            });
        }
        
        // Optimizar imágenes para móvil
        optimizeImagesForMobile();
    }
}

function optimizeImagesForMobile() {
    // Esta función podría optimizar imágenes para móvil
    // Por ahora solo es un placeholder
    console.log("📸 Optimizando imágenes para móvil");
}

// Forzar recarga si hay problemas
setTimeout(() => {
    if (document.readyState !== 'complete') {
        console.log("🔄 Forzando recarga de recursos...");
        window.location.reload();
    }
}, 3000);

// Inicializar mejoras para móvil después de la carga
if (window.innerWidth <= 768) {
    window.addEventListener('load', initMobileEnhancements);
}

// ===== FUNCIONES GLOBALES PARA ACCESO DESDE HTML =====
window.openGamesGallery = openGamesGallery;
window.openFaithGallery = openFaithGallery;
window.openWorkshopsGallery = openWorkshopsGallery;
window.openCommunityGallery = openCommunityGallery;
window.changeGalleryPhoto = changeGalleryPhoto;
window.deleteApplicant = deleteApplicant;
window.removeAllDuplicates = removeAllDuplicates;
window.showDuplicateModal = showDuplicateModal;
window.isApplicantDuplicate = isApplicantDuplicate;

console.log("✅ Sistema de gestión de duplicados cargado");