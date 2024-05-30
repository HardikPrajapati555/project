function initMap() {
    var map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 23.0225, lng: 72.5714 }, // Default center (can be adjusted)
        zoom: 12 // Default zoom level (can be adjusted)
    });

    var geocoder = new google.maps.Geocoder();

    // Listen for changes in the location input field
    var locationInput = document.getElementById('location');
    locationInput.addEventListener('input', function () {
        // Clear previous markers
        mapMarkers.forEach(function (marker) {
            marker.setMap(null);
        });

        // Geocode the input location
        geocoder.geocode({ address: locationInput.value }, function (results, status) {
            if (status === 'OK' && results[0]) {
                // Update map center
                map.setCenter(results[0].geometry.location);

                // Add marker for the input location
                var marker = new google.maps.Marker({
                    map: map,
                    position: results[0].geometry.location
                });

                // Store the marker
                mapMarkers.push(marker);
            } else {
                // Handle geocoding errors
                console.log('Geocode was not successful for the following reason:', status);
            }
        });
    });
}

// Initialize mapMarkers array to store markers
var mapMarkers = [];

// Load the map asynchronously
function loadMap() {
    var script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap';
    script.defer = true;
    document.body.appendChild(script);
}
loadMap();













document.getElementById("myForm").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the default form submission

    // Get form data
    const formData = new FormData(this);

    // Send form data to the server using fetch API
    fetch("/users/add", {
        method: "POST",
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            // Handle successful response from the server
            console.log("Form data submitted successfully:", data);
            // Optionally, redirect to another page or update UI
        })
        .catch(error => {
            // Handle errors
            console.error("Error submitting form data:", error);
        });
});