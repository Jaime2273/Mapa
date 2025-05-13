// Inicialización del mapa
const map = L.map('map').setView([38.7895, 0.1667], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Variables globales
let currentMarkers = [];
let currentTown = 'javea';
let townsData = {
    javea: { name: "Jávea", markers: [] },
    denia: { name: "Denia", markers: [] }
};
let selectedPosition = null;
let editingMarkerIndex = -1;

// Elementos del DOM
const townSelect = document.getElementById('town-select');
const exportBtn = document.getElementById('export-btn');
const formTitle = document.getElementById('form-title');
const markerTitleInput = document.getElementById('marker-title');
const markerDescInput = document.getElementById('marker-description');
const questionsContainer = document.getElementById('questions-container');
const addQuestionBtn = document.getElementById('add-question-btn');
const latInput = document.getElementById('lat-input');
const lngInput = document.getElementById('lng-input');
const selectOnMapBtn = document.getElementById('select-on-map');
const saveMarkerBtn = document.getElementById('save-marker-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const markersList = document.getElementById('markers-list');
const markerForm = document.getElementById('marker-form');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');

// Coordenadas aproximadas de localidades conocidas
const knownLocations = {
    'jávea': { lat: 38.7895, lng: 0.1667 },
    'denia': { lat: 38.8408, lng: 0.1057 },
    'madrid': { lat: 40.4168, lng: -3.7038 },
    'barcelona': { lat: 41.3851, lng: 2.1734 },
    'valencia': { lat: 39.4699, lng: -0.3763 },
    'alicante': { lat: 38.3452, lng: -0.4810 }
};

// Cargar datos iniciales
document.addEventListener('DOMContentLoaded', () => {
    loadTownsData();
    setupEventListeners();
    addQuestionField();
    setupToggleSidebar();
});

// Configurar event listeners
function setupEventListeners() {
    townSelect.addEventListener('change', handleTownChange);
    exportBtn.addEventListener('click', exportTownData);
    addQuestionBtn.addEventListener('click', addQuestionField);
    selectOnMapBtn.addEventListener('click', activateMapSelection);
    saveMarkerBtn.addEventListener('click', saveMarker);
    cancelEditBtn.addEventListener('click', cancelEdit);
    map.on('click', handleMapClick);
    searchInput.addEventListener('input', handleSearchInput);
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });
}

// Configurar el botón de toggle para la barra lateral
function setupToggleSidebar() {
    const toggleSidebarBtn = document.createElement('button');
    toggleSidebarBtn.id = 'toggle-sidebar';
    toggleSidebarBtn.textContent = '☰ Puntos';
    toggleSidebarBtn.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('visible');
    });
    document.getElementById('map').appendChild(toggleSidebarBtn);
}

// Manejar cambio de pueblo
function handleTownChange() {
    currentTown = townSelect.value;
    if (currentTown === 'new') {
        const townName = prompt("Introduce el nombre del nuevo pueblo:");
        if (townName) {
            currentTown = townName.toLowerCase().replace(/\s+/g, '-');
            townsData[currentTown] = { name: townName, markers: [] };
            updateTownSelect();
            townSelect.value = currentTown;
        } else {
            townSelect.value = 'javea';
            currentTown = 'javea';
        }
    }
    loadMarkersForTown();
}

// Cargar datos de pueblos
async function loadTownsData() {
    try {
        const savedTowns = await window.electronAPI.loadTowns();
        if (savedTowns) {
            townsData = { ...townsData, ...savedTowns };
            updateTownSelect();
        }
    } catch (error) {
        console.error("Error loading towns data:", error);
    }
}

// Actualizar selector de pueblos
function updateTownSelect() {
    const selectedValue = townSelect.value;
    townSelect.innerHTML = '';
    
    townSelect.appendChild(new Option("Jávea", "javea"));
    townSelect.appendChild(new Option("Denia", "denia"));
    
    Object.keys(townsData).forEach(townKey => {
        if (!['javea', 'denia'].includes(townKey)) {
            townSelect.appendChild(new Option(townsData[townKey].name, townKey));
        }
    });
    
    townSelect.appendChild(new Option("Crear nuevo pueblo", "new"));
    townSelect.value = selectedValue;
}

// Cargar marcadores para el pueblo actual
function loadMarkersForTown() {
    clearMap();
    currentMarkers = townsData[currentTown]?.markers || [];
    renderMarkers();
    renderMarkersList();
    resetMarkerForm();
}

// Limpiar mapa
function clearMap() {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
}

// Renderizar marcadores en el mapa
function renderMarkers() {
    currentMarkers.forEach((markerData, index) => {
        const marker = L.marker([markerData.lat, markerData.lng], {
            draggable: true
        }).addTo(map);
        
        marker.bindPopup(`
            <b>${markerData.title}</b>
            <p>${markerData.description}</p>
            <small>${markerData.lat.toFixed(4)}, ${markerData.lng.toFixed(4)}</small>
        `);
        
        marker.on('dragend', (e) => {
            const newPos = marker.getLatLng();
            markerData.lat = newPos.lat;
            markerData.lng = newPos.lng;
            updateMarkerInTownData(index, markerData);
        });
    });
}

// Renderizar lista de marcadores
function renderMarkersList() {
    markersList.innerHTML = '';
    
    currentMarkers.forEach((marker, index) => {
        const markerItem = document.createElement('div');
        markerItem.className = 'marker-item';
        markerItem.innerHTML = `
            <h3>${marker.title}</h3>
            <p>${marker.description}</p>
            <p class="coordinates">${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}</p>
            <div class="marker-actions">
                <button class="edit-marker-btn" data-index="${index}">
                    <span>✏️</span> Editar
                </button>
                <button class="delete-marker-btn" data-index="${index}">
                    <span>🗑️</span> Eliminar
                </button>
            </div>
        `;
        
        markerItem.querySelector('.edit-marker-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editMarker(index);
        });
        
        markerItem.querySelector('.delete-marker-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteMarker(index);
        });
        
        markerItem.addEventListener('click', () => {
            map.setView([marker.lat, marker.lng], 18);
        });
        
        markersList.appendChild(markerItem);
    });
}

// Añadir campo de pregunta
function addQuestionField() {
    const questionCount = document.querySelectorAll('.question-item').length + 1;
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.innerHTML = `
        <div class="question-header">
            <span>Pregunta ${questionCount}</span>
            <button class="remove-question-btn">🗑️ Eliminar</button>
        </div>
        <input type="text" class="question-input" placeholder="Texto de la pregunta">
        <input type="text" class="answer-input" placeholder="Respuesta correcta">
        <input type="text" class="wrong-answer" placeholder="Respuesta incorrecta 1">
        <input type="text" class="wrong-answer" placeholder="Respuesta incorrecta 2">
        <input type="text" class="wrong-answer" placeholder="Respuesta incorrecta 3">
    `;
    
    questionDiv.querySelector('.remove-question-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if (document.querySelectorAll('.question-item').length <= 1) {
            alert("Debe haber al menos una pregunta");
            return;
        }
        questionDiv.remove();
        updateQuestionNumbers();
    });
    
    questionsContainer.appendChild(questionDiv);
}

// Actualizar números de preguntas
function updateQuestionNumbers() {
    document.querySelectorAll('.question-item').forEach((item, index) => {
        item.querySelector('.question-header span').textContent = `Pregunta ${index + 1}`;
    });
}

// Activar selección en mapa
function activateMapSelection() {
    alert("Haz clic en el mapa para seleccionar la ubicación");
    map.once('click', (e) => {
        selectedPosition = e.latlng;
        latInput.value = selectedPosition.lat.toFixed(6);
        lngInput.value = selectedPosition.lng.toFixed(6);
        
        const feedback = document.createElement('div');
        feedback.className = 'map-click-feedback';
        feedback.style.left = `${e.containerPoint.x}px`;
        feedback.style.top = `${e.containerPoint.y}px`;
        document.getElementById('map').appendChild(feedback);
        
        setTimeout(() => feedback.remove(), 500);
    });
}

// Manejar clic en mapa
function handleMapClick(e) {
    if (e.originalEvent.target.closest('input, button, select, textarea')) {
        return;
    }
    
    const feedback = document.createElement('div');
    feedback.className = 'map-click-feedback';
    feedback.style.left = `${e.containerPoint.x}px`;
    feedback.style.top = `${e.containerPoint.y}px`;
    document.getElementById('map').appendChild(feedback);
    
    setTimeout(() => feedback.remove(), 500);
}

// Guardar marcador
function saveMarker() {
    const title = markerTitleInput.value.trim();
    const description = markerDescInput.value.trim();
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    
    if (!title || !description || isNaN(lat) || isNaN(lng)) {
        alert("Por favor completa todos los campos requeridos");
        return;
    }
    
    const questions = [];
    document.querySelectorAll('.question-item').forEach(qItem => {
        const question = qItem.querySelector('.question-input').value.trim();
        const correctAnswer = qItem.querySelector('.answer-input').value.trim();
        const wrongAnswers = Array.from(qItem.querySelectorAll('.wrong-answer'))
                                .map(input => input.value.trim())
                                .filter(val => val);
        
        if (question && correctAnswer && wrongAnswers.length >= 1) {
            questions.push({
                question,
                correctAnswer,
                wrongAnswers
            });
        }
    });
    
    if (questions.length === 0) {
        alert("Debes añadir al menos una pregunta válida");
        return;
    }
    
    const markerData = {
        title,
        description,
        lat,
        lng,
        questions
    };
    
    if (editingMarkerIndex >= 0) {
        townsData[currentTown].markers[editingMarkerIndex] = markerData;
    } else {
        townsData[currentTown].markers.push(markerData);
    }
    
    saveTownsData();
    loadMarkersForTown();
}

// Editar marcador
function editMarker(index) {
    const marker = townsData[currentTown].markers[index];
    if (!marker) return;
    
    markerForm.classList.add('editing');
    formTitle.textContent = "Editando Punto Existente";
    markerTitleInput.value = marker.title;
    markerDescInput.value = marker.description;
    latInput.value = marker.lat;
    lngInput.value = marker.lng;
    
    questionsContainer.innerHTML = '';
    
    marker.questions.forEach((q, qIndex) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.innerHTML = `
            <div class="question-header">
                <span>Pregunta ${qIndex + 1}</span>
                <button class="remove-question-btn">🗑️ Eliminar</button>
            </div>
            <input type="text" class="question-input" value="${q.question}">
            <input type="text" class="answer-input" value="${q.correctAnswer}">
            <input type="text" class="wrong-answer" value="${q.wrongAnswers[0] || ''}">
            <input type="text" class="wrong-answer" value="${q.wrongAnswers[1] || ''}">
            <input type="text" class="wrong-answer" value="${q.wrongAnswers[2] || ''}">
        `;
        
        questionDiv.querySelector('.remove-question-btn').addEventListener('click', (e) => {
            e.preventDefault();
            if (marker.questions.length <= 1) {
                alert("Debe haber al menos una pregunta");
                return;
            }
            questionDiv.remove();
            updateQuestionNumbers();
        });
        
        questionsContainer.appendChild(questionDiv);
    });
    
    editingMarkerIndex = index;
    saveMarkerBtn.textContent = "💾 Actualizar Punto";
    cancelEditBtn.style.display = 'inline-block';
    markerForm.scrollIntoView({ behavior: 'smooth' });
}

// Cancelar edición
function cancelEdit() {
    resetMarkerForm();
}

// Eliminar marcador
function deleteMarker(index) {
    if (confirm("¿Estás seguro de que quieres eliminar este punto de interés?")) {
        townsData[currentTown].markers.splice(index, 1);
        saveTownsData();
        loadMarkersForTown();
    }
}

// Resetear formulario
function resetMarkerForm() {
    formTitle.textContent = "Nuevo Punto de Interés";
    markerForm.classList.remove('editing');
    markerTitleInput.value = '';
    markerDescInput.value = '';
    latInput.value = '';
    lngInput.value = '';
    questionsContainer.innerHTML = '';
    addQuestionField();
    selectedPosition = null;
    editingMarkerIndex = -1;
    saveMarkerBtn.textContent = "💾 Guardar Punto";
    cancelEditBtn.style.display = 'none';
}

// Añadir marcador a los datos del pueblo
function addMarkerToTownData(markerData) {
    if (!townsData[currentTown]) {
        townsData[currentTown] = { name: currentTown, markers: [] };
    }
    townsData[currentTown].markers.push(markerData);
    saveTownsData();
}

// Actualizar marcador en los datos del pueblo
function updateMarkerInTownData(index, markerData) {
    if (townsData[currentTown] && townsData[currentTown].markers[index]) {
        townsData[currentTown].markers[index] = markerData;
        saveTownsData();
    }
}

// Exportar datos del pueblo
function exportTownData() {
    window.electronAPI.exportTownData(currentTown, townsData[currentTown]);
}

// Guardar datos de todos los pueblos
async function saveTownsData() {
    try {
        await window.electronAPI.saveTowns(townsData);
    } catch (error) {
        console.error("Error saving towns data:", error);
    }
}

// Manejar entrada de búsqueda
function handleSearchInput() {
    if (searchInput.value.trim() === '') {
        searchResults.style.display = 'none';
        searchResults.innerHTML = '';
    }
}

// Realizar búsqueda
function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    searchResults.innerHTML = '';
    
    // Buscar en localidades conocidas
    const results = Object.entries(knownLocations)
        .filter(([location]) => location.includes(query))
        .map(([location, coords]) => ({ location, ...coords }));

    // Buscar también en los pueblos cargados
    Object.entries(townsData).forEach(([key, town]) => {
        if (town.name.toLowerCase().includes(query)) {
            results.push({
                location: town.name,
                lat: town.markers[0]?.lat || knownLocations['jávea'].lat,
                lng: town.markers[0]?.lng || knownLocations['jávea'].lng
            });
        }
    });

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No se encontraron resultados</div>';
    } else {
        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.textContent = result.location;
            resultItem.addEventListener('click', () => {
                map.setView([result.lat, result.lng], 13);
                searchResults.style.display = 'none';
                
                // Si es un pueblo de nuestra lista, cargarlo
                const townKey = Object.keys(townsData).find(key => 
                    townsData[key].name.toLowerCase() === result.location.toLowerCase()
                );
                
                if (townKey) {
                    currentTown = townKey;
                    townSelect.value = townKey;
                    loadMarkersForTown();
                }
            });
            searchResults.appendChild(resultItem);
        });
    }
    
    searchResults.style.display = results.length ? 'block' : 'none';
}