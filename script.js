const RENDER_BACKEND_URL = 'https://iaminmaculada.onrender.com';

// ===== VARIABLES GLOBALES =====
let applicantCount = 0;
let applicants = [];
let isAdminAuthenticated = false;
const MAX_SPOTS = 100;

// Configuración de fechas
const CAMP_START_DATE = new Date('2026-01-08T09:00:00');

// Paleta de colores para PDF
const PDF_COLORS = {
    primary: [42, 110, 187],
    secondary: [255, 179, 71],
    accent: [255, 107, 139],
    light: [247, 250, 252],
    dark: [26, 32, 44],
    success: [56, 178, 172]
};

// ===== FUNCIONES PARA RENDER =====

// 1. Cargar estadísticas desde el backend
async function updateStatsFromBackend() {
    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/api/stats`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            applicantCount = data.total;
            console.log(`📊 Estadísticas desde Render: ${data.total} inscritos`);
            
            // Actualizar contadores en la página
            const counterElement = document.getElementById('applicantCount');
            const spotsElement = document.getElementById('availableSpots');
            const progressBar = document.getElementById('spotsProgressBar');
            
            if (counterElement) counterElement.textContent = data.total;
            if (spotsElement) spotsElement.textContent = data.availableSpots;
            
            if (progressBar) {
                const percentage = (data.total / 100) * 100;
                progressBar.style.width = `${percentage}%`;
                
                // Cambiar color según disponibilidad
                if (data.availableSpots <= 10) {
                    progressBar.style.background = 'linear-gradient(to right, #FF9800, #F56565)';
                } else if (data.availableSpots <= 30) {
                    progressBar.style.background = 'linear-gradient(to right, #FFB347, #FFCC80)';
                } else {
                    progressBar.style.background = 'linear-gradient(to right, #38B2AC, #4FD1C5)';
                }
            }
            
            return data;
        }
    } catch (error) {
        console.log("ℹ️ No se pudo conectar a Render, usando datos locales");
        return null;
    }
}

// 2. Verificar autenticación de admin
function checkAdminAuth() {
    const token = localStorage.getItem('iamAuthToken');
    const adminData = localStorage.getItem('iamAdmin');
    
    if (token && adminData) {
        try {
            const admin = JSON.parse(adminData);
            isAdminAuthenticated = true;
            console.log("✅ Admin autenticado desde localStorage:", admin.username);
        } catch (error) {
            console.warn("⚠️ Error parseando datos de admin:", error);
            localStorage.removeItem('iamAuthToken');
            localStorage.removeItem('iamAdmin');
        }
    }
}

// 3. Función de login actualizada para Render
async function loginToBackend(username, password, adminCode) {
    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, adminCode })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Guardar token y datos
            localStorage.setItem('iamAuthToken', data.token);
            localStorage.setItem('iamAdmin', JSON.stringify(data.admin));
            isAdminAuthenticated = true;
            
            console.log("✅ Login exitoso:", data.admin.username);
            return { success: true, admin: data.admin };
        } else {
            return { success: false, error: data.error };
        }
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        return { success: false, error: error.message || 'Error de conexión al servidor' };
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 IAM Frontend cargado");
    console.log("🔗 Conectando a:", RENDER_BACKEND_URL);
    
    try {
        // 1. Cargar estadísticas desde Render
        await updateStatsFromBackend();
        
        // 2. Cargar datos locales como backup
        await loadApplicantsFromStorage();
        
        // 3. Verificar si hay admin autenticado (token guardado)
        checkAdminAuth();
        
    } catch (error) {
        console.warn("⚠️ Error cargando datos iniciales:", error);
        // Fallback a solo localStorage
        await loadApplicantsFromStorage();
    }
    
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
    
    initScrollAnimations();
});

// ===== SISTEMA DE NAVEGACIÓN =====
function initNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mainNav = document.getElementById('mainNav');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (!mobileMenuBtn || !mainNav) return;
    
    function updateMenuVisibility() {
        if (window.innerWidth <= 768) {
            mobileMenuBtn.style.display = 'flex';
            mainNav.classList.remove('active');
            mobileMenuBtn.querySelector('i').classList.remove('fa-times');
            mobileMenuBtn.querySelector('i').classList.add('fa-bars');
        } else {
            mobileMenuBtn.style.display = 'none';
            mainNav.classList.remove('active');
            mobileMenuBtn.querySelector('i').classList.remove('fa-times');
            mobileMenuBtn.querySelector('i').classList.add('fa-bars');
            document.body.style.overflow = '';
        }
    }
    
    updateMenuVisibility();
    
    mobileMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        mainNav.classList.toggle('active');
        const icon = mobileMenuBtn.querySelector('i');
        
        if (mainNav.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
            document.body.style.overflow = 'hidden';
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
            document.body.style.overflow = '';
        }
    });
    
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                mainNav.classList.remove('active');
                mobileMenuBtn.querySelector('i').classList.remove('fa-times');
                mobileMenuBtn.querySelector('i').classList.add('fa-bars');
                document.body.style.overflow = '';
            }
            
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
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
    
    window.addEventListener('resize', updateMenuVisibility);
    window.addEventListener('load', updateMenuVisibility);
}

// ===== CUENTA REGRESIVA =====
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
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    submitBtn.disabled = true;
    
    try {
        // Recoger datos del formulario
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
        
        // Enviar a Render
        const response = await fetch(`${RENDER_BACKEND_URL}/api/applicants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicant)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Actualizar contadores desde backend
            await updateStatsFromBackend();
            
            // También guardar localmente como backup
            applicants.push(result.data);
            saveApplicantsToStorage();
            
            // Mostrar confirmación
            showConfirmationModal(result.data);
            form.reset();
            
            showNotification('✅ ¡Inscripción enviada al servidor!', 'success');
            
        } else {
            showNotification(`⚠️ ${result.error}`, 'warning');
            
            // Si es error de duplicado, guardar localmente de todas formas
            if (result.error.includes('duplicado') || result.error.includes('ya existe')) {
                await saveLocally(applicant, form);
            }
        }
        
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        showNotification('⚠️ Sin conexión - Guardando localmente', 'warning');
        
        // Guardar localmente como fallback
        await saveLocally(applicant, form);
        
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// ===== FUNCIÓN saveLocally =====
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
    applicants = [];
    applicantCount = 0;
    
    const storedApplicants = localStorage.getItem('iamApplicants');
    
    if (storedApplicants) {
        try {
            applicants = JSON.parse(storedApplicants);
            applicantCount = applicants.length;
            console.log(`📊 Cargados ${applicantCount} aventureros desde localStorage`);
        } catch (error) {
            console.error('Error cargando datos locales:', error);
        }
    }
}

function saveApplicantsToStorage() {
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
        
        localStorage.setItem('iamApplicants', JSON.stringify(applicants));
        
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

// ===== GALERÍA (MANTENER IGUAL) =====
function initGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    if (galleryItems[0]) galleryItems[0].addEventListener('click', () => openGamesGallery());
    if (galleryItems[1]) galleryItems[1].addEventListener('click', () => openFaithGallery());
    if (galleryItems[2]) galleryItems[2].addEventListener('click', () => openWorkshopsGallery());
    if (galleryItems[3]) galleryItems[3].addEventListener('click', () => openCommunityGallery());
}

function openGamesGallery() {
    const gamesPhotos = [
        { url: 'img/juegos-1.jpg', title: 'Juegos en Equipo', desc: 'Competencias divertidas que fomentan el trabajo en grupo' },
        { url: 'img/juegos-2.jpg', title: 'Carreras de Obstáculos', desc: 'Desafíos físicos para los aventureros más valientes' },
        { url: 'img/juegos-3.jpg', title: 'Captura la Bandera', desc: '¡Cada grupo con la bandera de los continentes!' },
        { url: 'img/juegos-6.jpg', title: 'Deportes al Aire Libre', desc: 'Fútbol, vóley y mucho más' },
        { url: 'img/juegos-5.jpg', title: 'Retos de Agilidad', desc: 'Coordinación y velocidad en acción' },
        { url: 'img/juegos-4.jpg', title: 'Deportes', desc: '¡Perfectos para divertirse!' }
    ];
    
    openGalleryModal('games', gamesPhotos, 'Juegos y Actividades', 'fa-gamepad');
}

function openFaithGallery() {
    const faithPhotos = [
        { url: 'img/Misa-3.jpg', title: 'Santa Misa Comunitaria', desc: 'Celebrando la Eucaristía todos juntos en el campamento' },
        { url: 'img/Adoracion-1.jpg', title: 'Adoración Eucarística', desc: 'Momento de oración silenciosa ante Jesús Sacramentado' },
        { url: 'img/Rezo-1.jpg', title: 'Rosario Comunitario', desc: 'Rezando con María como familia misionera' },
        { url: 'img/Misa-2.jpg', title: 'Sacramento de la Reconciliación', desc: 'Encuentro con la misericordia de Dios' },
        { url: 'img/Formacion-1.jpg', title: 'Lectio Divina', desc: 'Meditando la Palabra de Dios en grupo' },
        { url: 'img/Misa-1.jpg', title: 'Bendiciones Finales', desc: 'Enviados con la bendición para ser misioneros' }
    ];
    
    openGalleryModal('faith', faithPhotos, 'Vida Sacramental', 'fa-church');
}

function openWorkshopsGallery() {
    const workshopsPhotos = [
        { url: 'img/Formacion-2.jpg', title: 'Charlas Misioneras', desc: 'Aprendiendo sobre nuestra vocación de ser misioneros' },
        { url: 'img/Formacion-3.jpg', title: 'Formación en Valores', desc: 'Creciendo en virtudes cristianas' },
        { url: 'img/Formacion-4.jpg', title: 'Testimonios de Fe', desc: 'Compartiendo experiencias de encuentro con Jesús' },
        { url: 'img/Formacion-5.jpg', title: 'Grupos de Discusión', desc: 'Reflexionando juntos sobre la fe' },
        { url: 'img/Formacion-6.jpg', title: 'Oración Guiada', desc: 'Aprendiendo diferentes formas de orar' },
        { url: 'img/Formacion-7.jpg', title: 'Trabajos en Grupos', desc: 'Desarrollando actividades misioneras juntos' }
    ];
    
    openGalleryModal('workshops', workshopsPhotos, 'Formación', 'fa-comments');
}

function openCommunityGallery() {
    const communityPhotos = [
        { url: 'img/Fogata-1.jpg', title: 'Fogon', desc: 'Momento de cantos y juegos alrededor del fuego' },
        { url: 'img/Convivencia-1.jpg', title: 'Comidas en Comunidad', desc: 'Compartiendo los alimentos como familia' },
        { url: 'img/Convivencia-2.jpg', title: 'Juegos y Actividades en Equipo', desc: 'Dividiendo los equipos por el color de cada continente' },
        { url: 'img/Convivencia-3.jpg', title: 'Decorando el Campamento Misionero', desc: 'Reflejando nuestra identidad misionera en cada rincón' },
        { url: 'img/Convivencia-4.jpg', title: 'Cuentos y Diarios', desc: 'Actividades para reflejar lo vivido cada día' },
        { url: 'img/Convivencia-5.jpg', title: 'Actividades de Servicio', desc: 'Aprendiendo a servir como Jesús nos enseñó' }
    ];
    
    openGalleryModal('community', communityPhotos, 'Convivencia Cristiana', 'fa-users');
}

function openGalleryModal(galleryType, photos, title, iconClass) {
    const existingModal = document.querySelector('.gallery-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal gallery-modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '2000';
    
    let headerColor;
    switch(galleryType) {
        case 'games': headerColor = 'linear-gradient(135deg, var(--primary), #4A8FD9)'; break;
        case 'faith': headerColor = 'linear-gradient(135deg, #9C27B0, #BA68C8)'; break;
        case 'workshops': headerColor = 'linear-gradient(135deg, var(--accent), #FF9EB5)'; break;
        case 'community': headerColor = 'linear-gradient(135deg, var(--secondary), #FFCC80)'; break;
        default: headerColor = 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
    }
    
    const thumbnailsHTML = photos.map((photo, index) => `
        <div class="gallery-thumbnail ${index === 0 ? 'active' : ''}" 
             onclick="changeGalleryPhoto('${galleryType}', ${index})">
            <img src="${photo.url}" alt="${photo.title}" loading="lazy">
            <div class="thumbnail-overlay"><span>${index + 1}</span></div>
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
                    <img id="mainGalleryPhoto" src="${photos[0].url}" alt="${photos[0].title}" class="gallery-main-photo">
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
                <div class="gallery-thumbnails">${thumbnailsHTML}</div>
            </div>
            
            <div class="gallery-footer">
                <p><i class="fas fa-mouse-pointer"></i> Haz clic en las miniaturas</p>
                <p><i class="fas fa-arrows-alt-h"></i> Usa las flechas para navegar</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window.currentGallery = {
        type: galleryType,
        photos: photos,
        currentIndex: 0
    };
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
            window.currentGallery = null;
        }
    });
    
    document.addEventListener('keydown', handleGalleryKeyboard);
}

function changeGalleryPhoto(galleryType, directionOrIndex) {
    if (!window.currentGallery || window.currentGallery.type !== galleryType) {
        console.error('Galería no encontrada');
        return;
    }
    
    const gallery = window.currentGallery;
    const totalPhotos = gallery.photos.length;
    let newIndex;
    
    if (typeof directionOrIndex === 'number') {
        if (directionOrIndex === -1 || directionOrIndex === 1) {
            newIndex = gallery.currentIndex + directionOrIndex;
            if (newIndex < 0) newIndex = totalPhotos - 1;
            if (newIndex >= totalPhotos) newIndex = 0;
        } else {
            newIndex = directionOrIndex;
        }
    } else {
        console.error('Dirección o índice inválido');
        return;
    }
    
    gallery.currentIndex = newIndex;
    const photo = gallery.photos[newIndex];
    
    const mainImg = document.getElementById('mainGalleryPhoto');
    const mainTitle = document.getElementById('mainGalleryTitle');
    const mainDesc = document.getElementById('mainGalleryDesc');
    const currentCounter = document.getElementById('currentPhoto');
    
    if (mainImg) {
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
    
    const thumbnails = document.querySelectorAll('.gallery-thumbnail');
    thumbnails.forEach((thumb, i) => {
        thumb.classList.remove('active');
        if (i === newIndex) {
            thumb.classList.add('active');
            thumb.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    });
}

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
    
    if (message) message.textContent = `¡Felicidades ${applicant.fullName}! Tu misión de aventura IAM 2026 ha sido registrada.`;
    if (confirmName) confirmName.textContent = applicant.fullName;
    if (confirmId) confirmId.textContent = applicant.registrationNumber;
    
    if (modal) modal.style.display = 'flex';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== SISTEMA DE ADMINISTRACIÓN - ACTUALIZADO PARA RENDER =====
function initAdminSystem() {
    const adminAccessBtn = document.getElementById('adminAccessBtn');
    const loginModal = document.getElementById('loginModal');
    const adminModal = document.getElementById('adminModal');
    const loginForm = document.getElementById('loginForm');
    const cancelLogin = document.getElementById('cancelLogin');
    const closeAdmin = document.getElementById('closeAdmin');
    
    console.log("🔧 Inicializando sistema admin para Render...");
    
    if (!adminAccessBtn || !loginModal || !adminModal) {
        console.error("❌ Elementos críticos no encontrados");
        return;
    }
    
    // === 1. BOTÓN DE ACCESO ADMIN ===
    adminAccessBtn.onclick = function() {
        if (isAdminAuthenticated) {
            showAdminPanel();
        } else {
            loginModal.style.display = 'flex';
        }
    };
    
    // === 2. FORMULARIO DE LOGIN - PARA RENDER ===
    if (loginForm) {
        loginForm.onsubmit = async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const adminCode = document.getElementById('adminCode').value;
            
            console.log("🔐 Intentando login con Render...");
            
            const loginBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = loginBtn.innerHTML;
            
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            loginBtn.disabled = true;
            
            try {
                const result = await loginToBackend(username, password, adminCode);
                
                if (result.success) {
                    isAdminAuthenticated = true;
                    loginModal.style.display = 'none';
                    showAdminPanel();
                    showNotification('✅ ¡Acceso concedido al Cuartel General!', 'success');
                    loginForm.reset();
                    console.log("✅ Admin autenticado:", username);
                } else {
                    showNotification('❌ ' + result.error, 'error');
                }
            } catch (error) {
                console.error("Error en login:", error);
                showNotification('❌ Error de conexión', 'error');
            } finally {
                loginBtn.innerHTML = originalBtnText;
                loginBtn.disabled = false;
            }
            
            return false;
        };
    }
    
    // === 3. BOTÓN CANCELAR LOGIN ===
    if (cancelLogin) {
        cancelLogin.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            loginModal.style.display = 'none';
            if (loginForm) loginForm.reset();
            return false;
        };
        
        cancelLogin.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            loginModal.style.display = 'none';
            if (loginForm) loginForm.reset();
        });
    }
    
    // === 4. BOTÓN CERRAR PANEL ADMIN ===
    if (closeAdmin) {
        closeAdmin.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            adminModal.style.display = 'none';
            return false;
        };
        
        closeAdmin.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            adminModal.style.display = 'none';
        });
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

function showAdminPanel() {
    const adminModal = document.getElementById('adminModal');
    if (!adminModal) return;
    
    // Cargar datos desde Render si está autenticado
    if (isAdminAuthenticated) {
        loadAdminDataFromBackend();
    } else {
        updateAdminStats();
        updateRecentApplicants();
    }
    
    adminModal.style.display = 'flex';
}

// Cargar datos admin desde backend
async function loadAdminDataFromBackend() {
    try {
        const token = localStorage.getItem('iamAuthToken');
        
        // Cargar dashboard
        const dashboardResponse = await fetch(`${RENDER_BACKEND_URL}/api/admin/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            if (dashboardData.success) {
                // Actualizar estadísticas del panel
                const adminTotalCount = document.getElementById('adminTotalCount');
                const adminAvgAge = document.getElementById('adminAvgAge');
                const adminMedicalCount = document.getElementById('adminMedicalCount');
                
                if (adminTotalCount) adminTotalCount.textContent = dashboardData.stats.total;
                if (adminAvgAge) adminAvgAge.textContent = dashboardData.stats.ages.average;
                if (adminMedicalCount) adminMedicalCount.textContent = dashboardData.stats.medical.withConditions || 0;
            }
        }
        
        // Cargar inscritos recientes
        const applicantsResponse = await fetch(`${RENDER_BACKEND_URL}/api/admin/applicants?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (applicantsResponse.ok) {
            const applicantsData = await applicantsResponse.json();
            if (applicantsData.success) {
                updateRecentApplicantsFromBackend(applicantsData.data);
            }
        }
        
    } catch (error) {
        console.warn("⚠️ Error cargando datos admin, usando locales:", error);
        updateAdminStats();
        updateRecentApplicants();
    }
}

function updateAdminStats() {
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

function updateRecentApplicantsFromBackend(backendApplicants) {
    const container = document.getElementById('recentApplicants');
    if (!container) return;
    
    if (backendApplicants.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 30px; font-style: italic;">No hay nuevos reclutas todavía</p>';
        return;
    }
    
    container.innerHTML = backendApplicants.map(applicant => `
        <div class="applicant-item">
            <div class="applicant-info">
                <h5>${applicant.full_name || applicant.fullName}</h5>
                <p>${applicant.age} años • ${applicant.parish || 'Base secreta'}</p>
            </div>
            <div class="applicant-date">
                ${new Date(applicant.created_at || applicant.registrationDate).toLocaleDateString('es-ES')}
            </div>
        </div>
    `).join('');
}

async function updateRecentApplicants() {
    const container = document.getElementById('recentApplicants');
    if (!container) return;
    
    try {
        // Si hay token, intentar cargar desde backend
        const token = localStorage.getItem('iamAuthToken');
        if (token && isAdminAuthenticated) {
            const response = await fetch(`${RENDER_BACKEND_URL}/api/admin/applicants?limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    updateRecentApplicantsFromBackend(data.data);
                    return;
                }
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
                // Limpiar localStorage
                applicants = [];
                applicantCount = 0;
                localStorage.removeItem('iamApplicants');
                
                // Intentar limpiar en backend si hay token
                const token = localStorage.getItem('iamAuthToken');
                if (token) {
                    try {
                        await fetch(`${RENDER_BACKEND_URL}/api/admin/clear?adminKey=IAM2026&confirm=true`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                    } catch (error) {
                        console.warn("No se pudo limpiar en backend:", error);
                    }
                }
                
                updateApplicantCounter();
                updateAvailableSpots();
                updateAdminStats();
                updateRecentApplicants();
                
                showNotification('¡Misión reiniciada! Todos los datos han sido eliminados', 'warning');
                
            } catch (error) {
                showNotification('Error al limpiar datos', 'error');
            }
        });
    }
    
    // Botón: Limpiar Duplicados
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
    
    // Botón: Limpiar Todos los Duplicados
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
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ===== FUNCIONES RESTANTES (MANTENER IGUAL) =====
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
        
        const marginLeft = 15;
        const marginTop = 20;
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        doc.setFillColor(...PDF_COLORS.primary);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        doc.setFillColor(...PDF_COLORS.secondary);
        doc.circle(pageWidth / 2, 60, 35, 'F');
        doc.setFontSize(28);
        doc.setTextColor(255, 255, 255);
        doc.text('IAM', pageWidth / 2, 65, { align: 'center' });
        
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('AVENTURA MISIONERA IAM 2026', pageWidth / 2, 100, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(...PDF_COLORS.secondary);
        doc.text('Lista de Aventureros - Campamento', pageWidth / 2, 120, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text(`Total de aventureros: ${applicantCount}`, pageWidth / 2, 150, { align: 'center' });
        doc.text(`Plazas disponibles: ${MAX_SPOTS - applicantCount}`, pageWidth / 2, 160, { align: 'center' });
        doc.text(`Fecha del reporte: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 170, { align: 'center' });
        
        doc.setDrawColor(...PDF_COLORS.accent);
        doc.setLineWidth(2);
        doc.line(pageWidth / 2 - 80, 180, pageWidth / 2 + 80, 180);
        
        doc.setFontSize(10);
        doc.setTextColor(...PDF_COLORS.secondary);
        doc.text('Documento confidencial - Cuartel General de la Aventura', pageWidth / 2, 200, { align: 'center' });
        
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

// ===== FUNCIONES GLOBALES =====
window.openGamesGallery = openGamesGallery;
window.openFaithGallery = openFaithGallery;
window.openWorkshopsGallery = openWorkshopsGallery;
window.openCommunityGallery = openCommunityGallery;
window.changeGalleryPhoto = changeGalleryPhoto;

console.log("✅ Script de Campamento Misionero IAM cargado correctamente");