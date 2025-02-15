function controlDevice(deviceId, action) {
    fetch('/devices/control', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId, action }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Device control:', data);
        // Here you might want to update the UI or refresh the page
        location.reload();
    })
    .catch(error => console.error('Error:', error));
}