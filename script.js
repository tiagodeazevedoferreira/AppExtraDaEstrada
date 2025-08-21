// Chave de API da Geoapify
const API_KEY = '866771b8739f4b1e8b439fc58f45cfcb';

// Inicializa o mapa com Leaflet
let map = null;
function initMap(lat, lng) {
    if (map) {
        map.setView([lat, lng], 12); // Atualiza a visualização se o mapa já existe
        return;
    }
    map = L.map('map').setView([lat, lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Função para buscar locais
function searchPlaces() {
    const categories = [];
    if (document.getElementById('padaria').checked) categories.push(document.getElementById('padaria').value);
    if (document.getElementById('cafe').checked) categories.push(document.getElementById('cafe').value);
    if (document.getElementById('doceria').checked) categories.push(document.getElementById('doceria').value);

    if (categories.length === 0) {
        alert('Selecione pelo menos uma categoria!');
        return;
    }

    // Limpa resultados anteriores
    document.getElementById('results').innerHTML = '';
    if (map) map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });

    // Obtém a localização do usuário
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            initMap(lat, lng);
            fetchPlaces(lat, lng, categories);
        }, () => {
            alert('Não foi possível obter sua localização. Usando São Paulo como padrão.');
            const lat = -23.5505;
            const lng = -46.6333;
            initMap(lat, lng);
            fetchPlaces(lat, lng, categories);
        });
    } else {
        alert('Geolocalização não é suportada pelo seu navegador.');
        const lat = -23.5505;
        const lng = -46.6333;
        initMap(lat, lng);
        fetchPlaces(lat, lng, categories);
    }
}

// Função para fazer a requisição à Geoapify
function fetchPlaces(lat, lng, categories) {
    // Combina todas as categorias em uma string única separada por vírgulas
    const combinedCategories = categories.join(',');
    const url = `https://api.geoapify.com/v2/places?categories=${combinedCategories}&filter=circle:${lng.toFixed(7)},${lat.toFixed(7)},5000&bias=proximity:${lng.toFixed(7)},${lat.toFixed(7)}&limit=20&lang=pt&apiKey=${API_KEY}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.features && data.features.length > 0) {
                displayResults(data.features, 'Resultados combinados');
            } else {
                document.getElementById('results').innerHTML += `<p>Nenhum resultado encontrado.</p>`;
            }
        })
        .catch(error => {
            console.error('Erro na busca:', error);
            document.getElementById('results').innerHTML += `<p>Erro na busca: ${error.message}</p>`;
        });
}

// Função para exibir os resultados
function displayResults(places, title) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML += `<h3>${title}:</h3><ul>`;
    places.forEach(place => {
        const name = place.properties.name || 'Sem nome';
        const address = place.properties.formatted || 'Endereço não disponível';
        resultsDiv.innerHTML += `<li>${name} - ${address}</li>`;
        if (map && place.geometry.coordinates) {
            L.marker([place.geometry.coordinates[1], place.geometry.coordinates[0]])
                .addTo(map)
                .bindPopup(`${name}<br>${address}`);
        }
    });
    resultsDiv.innerHTML += '</ul>';
}

// Registra o Service Worker
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => console.log('Service Worker registrado:', registration))
            .catch(error => console.error('Erro ao registrar Service Worker:', error));
    });
}