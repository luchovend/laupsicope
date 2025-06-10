
// Configuracion de Supabase
const SUPABASE_URL = 'https://wwukwwlrceszawotljau.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dWt3d2xyY2VzemF3b3RsamF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NzE5OTQsImV4cCI6MjA2NDE0Nzk5NH0.w85OwTsxhWNMWqKNPQAyQ_GSnXf_SGjcb-FAP4D6nAs'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Logica Principal
document.addEventListener('DOMContentLoaded', () => {
    handleTheme();

    const path = window.location.pathname.split('/').pop();

    if (path === 'admin.html' || path === 'admin' || path === '') {
        handleLoginPage();
    } else if (path === 'dashboard.html' || path === 'dashboard') {
        handleDashboardPage();
    }
});


//Funcion modo Oscuro/Claro
function handleTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;

    const applyTheme = (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    };
    
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));

    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}


// Funciones para la Pagina de Login (admin.html)
function handleLoginPage() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            window.location.href = 'dashboard.html';
        }
    });

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = event.target.email.value;
        const password = event.target.password.value;
        const errorMessage = document.getElementById('error-message');

        try {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (error) {
            errorMessage.textContent = 'Error: ' + error.message;
        }
    });
}


// Funciones para la Pagina del Panel (dashboard.html) 
async function handleDashboardPage() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'admin.html';
        return;
    }

    document.getElementById('logout-button').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'admin.html';
    });

    loadMatricula();
    setupMatriculaForm();
    loadSpecialties();
    setupSpecialtiesForm();
    loadMessages();
    setupMessageFilter();
    setupDateFilter();
    subscribeToNewMessages(); 
}

async function loadMatricula() {
    const matriculaInput = document.getElementById('matricula-input');
    const matriculaMessage = document.getElementById('matricula-message');
    if (!matriculaInput || !matriculaMessage) return;
    try {
        const { data, error } = await supabaseClient.from('configuracion').select('valor').eq('clave', 'matricula_profesional').single();
        if (error) throw error;
        if (data) matriculaInput.value = data.valor;
    } catch (error) {
        matriculaMessage.textContent = 'Error al cargar la matrícula.';
        console.error('Error cargando matrícula:', error);
    }
}
function setupMatriculaForm() {
    const matriculaForm = document.getElementById('matricula-form');
    const matriculaMessage = document.getElementById('matricula-message');
    if (!matriculaForm || !matriculaMessage) return;
    matriculaForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const newValue = document.getElementById('matricula-input').value;
        matriculaMessage.textContent = '';
        try {
            const { error } = await supabaseClient.from('configuracion').update({ valor: newValue }).eq('clave', 'matricula_profesional');
            if (error) throw error;
            matriculaMessage.textContent = '¡Matrícula guardada con éxito!';
            matriculaMessage.style.color = 'green';
            setTimeout(() => { matriculaMessage.textContent = ''; }, 3000);
        } catch (error) {
            matriculaMessage.textContent = 'Error al guardar la matrícula.';
            console.error('Error guardando matrícula:', error);
        }
    });
}

async function loadSpecialties() {
    const container = document.getElementById('specialties-container');
    if (!container) return;

    try {
        const { data, error } = await supabaseClient.from('specialties').select('*').order('id', { ascending: true });
        if (error) throw error;

        container.innerHTML = ''; 
        data.forEach(spec => {
            const fieldset = document.createElement('div');
            fieldset.className = 'grid grid-cols-1 sm:grid-cols-6 gap-3 items-center';
            fieldset.innerHTML = `
                <div class="sm:col-span-4">
                    <label for="spec-name-${spec.id}" class="sr-only">Nombre de Especialidad ${spec.id}</label>
                    <input type="text" id="spec-name-${spec.id}" value="${spec.name}" data-id="${spec.id}" class="spec-name-input w-full p-2 border rounded-md shadow-sm">
                </div>
                <div class="sm:col-span-2">
                    <label for="spec-perc-${spec.id}" class="sr-only">Porcentaje de Especialidad ${spec.id}</label>
                    <div class="relative">
                        <input type="number" id="spec-perc-${spec.id}" value="${spec.percentage}" min="0" max="100" class="spec-perc-input w-full p-2 border rounded-md shadow-sm pr-8">
                        <span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--subtle-text-color)]">%</span>
                    </div>
                </div>
            `;
            container.appendChild(fieldset);
        });

    } catch(error) {
        container.innerHTML = `<p class="text-red-500">Error al cargar las especialidades.</p>`;
        console.error('Error cargando especialidades:', error);
    }
}

function setupSpecialtiesForm() {
    const form = document.getElementById('specialties-form');
    const messageEl = document.getElementById('specialties-message');
    if (!form || !messageEl) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageEl.textContent = '';

        const nameInputs = form.querySelectorAll('.spec-name-input');
        const percInputs = form.querySelectorAll('.spec-perc-input');

        const updates = [];
        for (let i = 0; i < nameInputs.length; i++) {
            updates.push({
                id: nameInputs[i].dataset.id,
                name: nameInputs[i].value,
                percentage: parseInt(percInputs[i].value, 10) || 0
            });
        }

        try {
            const { error } = await supabaseClient.from('specialties').upsert(updates);
            if (error) throw error;
            
            messageEl.textContent = '¡Especialidades guardadas con éxito!';
            messageEl.style.color = 'green';
            setTimeout(() => { messageEl.textContent = ''; }, 3000);

        } catch (error) {
            messageEl.textContent = 'Error al guardar las especialidades.';
            messageEl.style.color = 'red';
            console.error('Error guardando especialidades:', error)
        }
    });
}


async function loadMessages(sortOrder = 'desc', startDate = null, endDate = null) {
    const container = document.getElementById('messages-container');
    if (!container) return;
    container.innerHTML = `<p id="loading-messages" class="text-[var(--subtle-text-color)]"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando mensajes...</p>`;
    try {
        let query = supabaseClient.from('mensajes_contacto').select('*').order('created_at', { ascending: sortOrder === 'asc' });
        if (startDate) query = query.gte('created_at', new Date(startDate + 'T00:00:00.000Z').toISOString());
        if (endDate) query = query.lte('created_at', new Date(endDate + 'T23:59:59.999Z').toISOString());
        const { data: messages, error } = await query;
        if (error) throw error;
        container.innerHTML = '';
        if (messages.length === 0) {
            container.innerHTML = '<p id="no-messages-placeholder" class="text-[var(--subtle-text-color)]">No se encontraron mensajes con los filtros aplicados.</p>';
            return;
        }
        messages.forEach(msg => container.appendChild(createMessageCard(msg)));
        document.getElementById('filter-input').dispatchEvent(new Event('keyup'));
    } catch (error) {
        container.innerHTML = `<p class="text-red-500">Error al cargar los mensajes.</p>`;
    }
}

function subscribeToNewMessages() {
    const container = document.getElementById('messages-container');
    const sortSelect = document.getElementById('date-sort-select');
    
    const subscription = supabaseClient.channel('public:mensajes_contacto')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_contacto' }, 
        (payload) => {
            console.log('Realtime INSERT event received:', payload); // Log para INSERT
            const startDateInput = document.getElementById('start-date-input');
            const endDateInput = document.getElementById('end-date-input');
            
            if (sortSelect.value === 'desc' && !startDateInput.value && !endDateInput.value) {
                const newCard = createMessageCard(payload.new);
                const noMessagesPlaceholder = document.getElementById('no-messages-placeholder');
                if(noMessagesPlaceholder) noMessagesPlaceholder.remove();
                container.prepend(newCard);
            }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mensajes_contacto' },
        (payload) => {
            console.log('Realtime DELETE event received:', payload); 
            const deletedMessageId = payload.old.id;
            const cardToRemove = document.getElementById(`message-card-${deletedMessageId}`);
            if (cardToRemove) {
                console.log('Removing card:', cardToRemove); 
                cardToRemove.remove();
                const messagesContainer = document.getElementById('messages-container');
                if (messagesContainer.children.length === 0) {
                    messagesContainer.innerHTML = '<p id="no-messages-placeholder" class="text-[var(--subtle-text-color)]">No se encontraron mensajes con los filtros aplicados.</p>';
                }
            } else {
                console.log('Card not found for ID:', deletedMessageId); 
            }
        })
        .subscribe();
    
    // Log para el estado de la suscripción
    subscription.on('CHANNEL_STATE', (state) => {
        console.log('Supabase Realtime channel state:', state);
    });

    return subscription;
}

async function deleteMessage(messageId) {
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    const cancelDeleteButton = document.getElementById('cancel-delete-button');

    confirmationModal.classList.remove('hidden');

    return new Promise((resolve) => {
        const onConfirm = async () => {
            confirmationModal.classList.add('hidden');
            try {
                const { error } = await supabaseClient.from('mensajes_contacto').delete().eq('id', messageId);
                if (error) throw error;
                console.log('Mensaje eliminado con éxito en DB:', messageId); 
                resolve(true);
            } catch (error) {
                console.error('Error al eliminar el mensaje en DB:', error); 
                resolve(false);
            } finally {
                confirmDeleteButton.removeEventListener('click', onConfirm);
                cancelDeleteButton.removeEventListener('click', onCancel);
            }
        };

        const onCancel = () => {
            confirmationModal.classList.add('hidden');
            resolve(false);
            confirmDeleteButton.removeEventListener('click', onConfirm);
            cancelDeleteButton.removeEventListener('click', onCancel);
        };

        confirmDeleteButton.addEventListener('click', onConfirm);
        cancelDeleteButton.addEventListener('click', onCancel);
    });
}


function createMessageCard(msg) {
    const card = document.createElement('div');
    card.id = `message-card-${msg.id}`;
    card.className = 'p-4 rounded-lg shadow-sm message-card';
    
    const formattedDate = new Date(msg.created_at).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const contentHTML = `
        <div class="flex justify-end items-center mb-2">
            <p class="text-xs" style="color: var(--subtle-text-color);">Recibido: ${formattedDate}</p>
        </div>
        <div class="space-y-2">
            <p><span class="font-semibold" style="color: var(--subtle-text-color);">Nombre:</span> <span style="color: var(--text-color);">${msg.nombre}</span></p>
            <p><span class="font-semibold" style="color: var(--subtle-text-color);">Email:</span> <a href="mailto:${msg.email}" class="text-blue-600 hover:underline dark:text-blue-400">${msg.email}</a></p>
            <p><span class="font-semibold" style="color: var(--subtle-text-color);">Asunto:</span> <span style="color: var(--text-color);">${msg.asunto}</span></p>
            <div class="pt-2 mt-2 border-t" style="border-color: var(--border-color);">
                <p class="font-semibold" style="color: var(--subtle-text-color);">Mensaje:</p>
                <p class="mt-1" style="color: var(--text-color); white-space: pre-wrap;">${msg.mensaje}</p>
            </div>
        </div>
    `;
    card.innerHTML = contentHTML;

    const footer = document.createElement('div');
    footer.className = 'flex justify-end pt-3 mt-3 border-t gap-2';
    footer.style.borderColor = 'var(--border-color)';

    const captureButton = document.createElement('button');
    captureButton.innerHTML = '<i class="fas fa-camera mr-2"></i>Capturar';
    captureButton.className = 'px-3 py-1 text-xs font-semibold transition-colors duration-200 rounded-md shadow-sm btn-secondary flex items-center';
    captureButton.title = 'Guardar captura de este mensaje';

    captureButton.addEventListener('click', (e) => {
        e.preventDefault();
        footer.style.visibility = 'hidden';

        html2canvas(card, {
            useCORS: true,
            backgroundColor: getComputedStyle(card).backgroundColor,
            scale: 2 
        }).then(canvas => {
            const link = document.createElement('a');
            const safeName = msg.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const dateStamp = new Date(msg.created_at).toISOString().split('T')[0];
            link.download = `mensaje_${safeName}_${dateStamp}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            footer.style.visibility = 'visible';
        }).catch(err => {
            console.error('Error al usar html2canvas:', err);
            footer.style.visibility = 'visible';
        });
    });

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<i class="fas fa-trash-alt mr-2"></i>Eliminar';
    deleteButton.className = 'px-3 py-1 text-xs font-semibold transition-colors duration-200 rounded-md shadow-sm bg-red-500 text-white hover:bg-red-600 flex items-center';
    deleteButton.title = 'Eliminar este mensaje';

    deleteButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await deleteMessage(msg.id);
    });

    footer.appendChild(captureButton);
    footer.appendChild(deleteButton);
    card.appendChild(footer);

    return card;
}


function setupMessageFilter() {
    const filterInput = document.getElementById('filter-input');
    const container = document.getElementById('messages-container');
    if (!filterInput || !container) return;
    filterInput.addEventListener('keyup', () => {
        const filterText = filterInput.value.toLowerCase();
        const messageCards = container.querySelectorAll('.message-card');
        messageCards.forEach(card => card.style.display = card.textContent.toLowerCase().includes(filterText) ? 'block' : 'none');
    });
}

function setupDateFilter() {
    const sortSelect = document.getElementById('date-sort-select');
    const applyBtn = document.getElementById('apply-date-filter-btn');
    const clearBtn = document.getElementById('clear-date-filter-btn');
    const startDateInput = document.getElementById('start-date-input');
    const endDateInput = document.getElementById('end-date-input');
    if (!sortSelect || !applyBtn || !clearBtn || !startDateInput || !endDateInput) return;
    const applyAllFilters = () => loadMessages(sortSelect.value, startDateInput.value || null, (endDateInput.value || startDateInput.value) || null);
    applyBtn.addEventListener('click', applyAllFilters);
    sortSelect.addEventListener('change', applyAllFilters);
    clearBtn.addEventListener('click', () => {
        startDateInput.value = '';
        endDateInput.value = '';
        loadMessages(sortSelect.value, null, null); 
    });
}
