// Chave de API da Geoapify
const API_KEY = '866771b8739f4b1e8b439fc58f45cfcb';

// Inicializa o mapa com Leaflet
let map = null;
let currentOffset = 0;
let currentResultsCount = 0;

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

// Função para geocodificar endereço em coordenadas ou place_id
async function geocodeAddress(address) {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&filter=countrycode:br&apiKey=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
        const data = await response.json();
        if (data.features && data.features.length > 0) {
            const props = data.features[0].properties;
            return { lat: props.lat, lng: props.lon, placeId: props.place_id || null };
        } else {
            throw new Error('Endereço não encontrado.');
        }
    } catch (error) {
        alert(`Erro ao geocodificar endereço: ${error.message}. Usando localização padrão.`);
        return null;
    }
}

// Função para buscar locais
async function searchPlaces(offset = 0) {
    const loader = document.getElementById('loader');
    const searchButton = document.getElementById('searchButton');
    
    // Mostra loader e desabilita botão de busca
    loader.style.display = 'block';
    if (searchButton) searchButton.disabled = true;

    const categories = [];
    if (document.getElementById('padaria').checked) categories.push(document.getElementById('padaria').value);
    if (document.getElementById('cafe').checked) categories.push(document.getElementById('cafe').value);
    if (document.getElementById('doceria').checked) categories.push(document.getElementById('doceria').value);

    if (categories.length === 0) {
        alert('Selecione pelo menos uma categoria!');
        loader.style.display = 'none';
        if (searchButton) searchButton.disabled = false;
        return;
    }

    // Limpa resultados anteriores
    document.getElementById('results').innerHTML = '';
    if (map) map.eachLayer(layer => { if (layer instanceof L.Marker) map.removeLayer(layer); });

    let lat, lng, placeId = null;
    const address = document.getElementById('address').value.trim();
    const specificTerm = document.getElementById('specificTerm').value.trim();
    const radius = document.getElementById('radius').value;

    if (address) {
        // Usa endereço digitado
        const coords = await geocodeAddress(address);
        if (coords) {
            lat = coords.lat;
            lng = coords.lng;
            placeId = coords.placeId;
        } else {
            // Fallback se geocodificação falhar
            lat = -23.5505;
            lng = -46.6333;
        }
    } else {
        // Usa geolocalização se endereço vazio
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                lat = position.coords.latitude;
                lng = position.coords.longitude;
            } catch {
                alert('Não foi possível obter sua localização. Usando São Paulo como padrão.');
                lat = -23.5505;
                lng = -46.6333;
            }
        } else {
            alert('Geolocalização não é suportada pelo seu navegador.');
            lat = -23.5505;
            lng = -46.6333;
        }
    }

    initMap(lat, lng);
    currentOffset = offset;
    fetchPlaces(lat, lng, categories, specificTerm, radius, placeId);
}

// Função para fazer a requisição à Geoapify Places API
function fetchPlaces(lat, lng, categories, specificTerm, radius, placeId) {
    const loader = document.getElementById('loader');
    const searchButton = document.getElementById('searchButton');
    const combinedCategories = categories.join(',');
    let url = `https://api.geoapify.com/v2/places?categories=${combinedCategories}`;
    
    // Usa placeId para filtrar por bairro/cidade, se disponível; senão, usa círculo
    if (placeId) {
        url += `&filter=place:${placeId}`;
    } else {
        url += `&filter=circle:${lng.toFixed(7)},${lat.toFixed(7)},${radius}`;
    }
    
    url += `&bias=proximity:${lng.toFixed(7)},${lat.toFixed(7)}&limit=20&lang=pt&offset=${currentOffset}&apiKey=${API_KEY}`;
    
    // Adiciona termos específicos se fornecidos
    if (specificTerm) {
        const terms = specificTerm.split(',').map(term => term.trim()).filter(term => term);
        if (terms.length > 0) {
            url += `&name=${encodeURIComponent(terms.join(','))}`;
        }
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            currentResultsCount = data.features ? data.features.length : 0;
            updatePaginationButtons();
            if (data.features && data.features.length > 0) {
                // Ordena por distância
                data.features.sort((a, b) => (a.properties.distance || 0) - (b.properties.distance || 0));
                displayResults(data.features, 'Resultados combinados');
            } else {
                document.getElementById('results').innerHTML += `<p>Nenhum resultado encontrado.</p>`;
            }
        })
        .catch(error => {
            console.error('Erro na busca:', error);
            document.getElementById('results').innerHTML += `<p>Erro na busca: ${error.message}</p>`;
        })
        .finally(() => {
            loader.style.display = 'none';
            if (searchButton) searchButton.disabled = false;
        });
}

// Função para atualizar botões de paginação
function updatePaginationButtons() {
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    if (prevButton) prevButton.disabled = currentOffset === 0;
    if (nextButton) nextButton.disabled = currentResultsCount < 20;
}

// Função para exibir os resultados
function displayResults(places, title) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML += `<h3>${title}:</h3><ul>`;
    places.forEach(place => {
        const name = place.properties.name || 'Sem nome';
        const address = place.properties.formatted || 'Endereço não disponível';
        const distance = place.properties.distance ? `${(place.properties.distance / 1000).toFixed(2)} km` : 'Distância desconhecida';
        resultsDiv.innerHTML += `<li>${name} - ${address} (${distance})</li>`;
        if (map && place.geometry.coordinates) {
            L.marker([place.geometry.coordinates[1], place.geometry.coordinates[0]])
                .addTo(map)
                .bindPopup(`${name}<br>${address}<br>${distance}`);
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