const API_KEY = '866771b8739f4b1e8b439fc58f45cfcb';
let map = null;

function initMap(lat, lng) {
    if (map) {
        map.setView([lat, lng], 12);
        return;
    }
    map = L.map('map').setView([lat, lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

function searchPlaces() {
    const categories = [];
    if (document.getElementById('padaria').checked) categories.push('commercial.food_and_drink.bakery');
    if (document.getElementById('cafe').checked) categories.push('commercial.food_and_drink.cafe');
    if (document.getElementById('doceria').checked) categories.push('confeitaria');

    if (categories.length === 0) {
        alert('Selecione pelo menos uma categoria!');
        return;
    }

    document.getElementById('results').innerHTML = '';
    if (map) {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) map.removeLayer(layer);
        });
    }

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

function fetchPlaces(lat, lng, categories) {
    categories.forEach(category => {
        let url;
        if (category.includes('commercial.food_and_drink')) {
            url = `https://api.geoapify.com/v2/places?categories=${category}&filter=circle:${lng},${lat},5000&limit=20&apiKey=${API_KEY}`;
        } else {
            url = `https://api.geoapify.com/v2/places?name=${category}&filter=circle:${lng},${lat},5000&limit=20&apiKey=${API_KEY}`;
        }

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.features && data.features.length > 0) {
                    displayResults(data.features, category);
                } else {
                    document.getElementById('results').innerHTML += `<p class="error">Nenhum resultado encontrado para ${category}.</p>`;
                }
            })
            .catch(error => {
                console.error('Erro na busca:', error);
                document.getElementById('results').innerHTML += `<p class="error">Erro ao buscar ${category}: ${error.message}</p>`;
            });
    });
}

function displayResults(places, category) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML += `<h3>Resultados para ${category}:</h3><ul>`;
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

if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => console.log('Service Worker registrado:', registration))
            .catch(error => console.error('Erro ao registrar Service Worker:', error));
    });
}