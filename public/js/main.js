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
                    li.className = 'list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-center';

                    // Device info with emoji
                    const deviceInfo = document.createElement('span');
                    const emoji = device.type === 'Plug' ? '🔌' : '💡';
                    deviceInfo.innerHTML = emoji + ' ' + `${device.room} ${device.name}`;
                    deviceInfo.className = 'mr-sm-2 mb-2 mb-sm-0';

                    // Button container
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'btn-group d-flex flex-row';

                    const onButton = createButton('On', 'btn btn-success', () => controlDevice(device.id, 'on'));
                    const offButton = createButton('Off', 'btn btn-danger', () => controlDevice(device.id, 'off'));

                    buttonContainer.appendChild(onButton);
                    buttonContainer.appendChild(offButton);

                    li.appendChild(deviceInfo);
                    li.appendChild(buttonContainer);
                    list.appendChild(li);
                });
            });
        })
        .catch(error => console.error('Error fetching devices:', error));
}

function fetchStatus(deviceId) {
    return fetch(`/status/${deviceId}`)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.error) {
                console.error(`Status fetch error for ${deviceId}:`, data.error);
                return 'unknown'; 
            }
            console.log(`Status for ${deviceId}:`, data.status);
            return data.status;
        })
        .catch(error => {
            console.error('Error fetching status:', error);
            return 'unknown'; // or another default status
        });
}

function createButton(text, className, onClick) {
    const button = document.createElement('button');
    button.className = className;
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