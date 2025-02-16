document.addEventListener('DOMContentLoaded', () => {
    fetchDevices();
});

function fetchDevices() {
    fetch('/devices')
        .then(response => response.json())
        .then(devices => {
            const list = document.getElementById('devicesList');
            list.innerHTML = ''; // Clear existing list
            
            const promises = devices.map(device => 
                fetchStatus(device.id).then(status => ({
                    ...device,
                    status: status
                }))
            );

            Promise.all(promises).then(updatedDevices => {
                updatedDevices.forEach(device => {
                    const li = document.createElement('li');
                    li.textContent = `${device.room + " " + device.name}`;
                    const onButton = createButton('On', () => controlDevice(device.id, 'on'));
                    const offButton = createButton('Off', () => controlDevice(device.id, 'off'));
                    li.appendChild(onButton);
                    li.appendChild(offButton);
                    list.appendChild(li);
                });
            });
        })
        .catch(error => console.error('Error fetching devices:', error));
}

function fetchStatus(deviceId) {
    return fetch(`/status/${deviceId}`)
        .then(response => response.json())
        .then(data => data.status)
        .catch(error => {
            console.error('Error fetching status:', error);
            return 'unknown'; // or another default status
        });
}

function createButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.onclick = onClick;
    return button;
}

function controlDevice(deviceId, action) {
    fetch('/control', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId, action }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Device control:', data);
        fetchDevices(); // Refresh device list with new status
    })
    .catch(error => console.error('Error:', error));
}