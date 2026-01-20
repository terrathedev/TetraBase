import express from 'express';
import { Server } from 'socket.io';
import Docker from 'dockerode';
import http from 'http';
import path from "path";

// EMBED CSS: This reads the file at BUILD TIME and bakes it into the script

const docker = new Docker();
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<title>TetraBase</title>
<img src="tetrabase-img.png" width="90px" height="90px">
<img src="docker-img.png" width="90px" height="90px">
<script src="/socket.io/socket.io.js"></script>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
<header>
<h1>TetraBase</h1>
<p class="subtitle">Manage Database Containers</p>
</header>

<h2>Launch New Instance</h2>
<div class="input-group">
<select id="dbType">
<option>PostgreSQL</option>
<option>Redis</option>
<option>MongoDB</option>
<option>Neo4j</option>
</select>
<input id="port" type="number" placeholder="Port (e.g. 5432)">
<button id="deployBtn" onclick="launchDB()">Deploy Database</button>
<p id="pullStatus" class="pull-status hidden">Checking images and pulling...</p>
</div>

<h2 class="status-title">Live Status</h2>
<div id="status-list">
<p style="color: var(--text-dim)">Connecting to Docker engine...</p>

<script>
const socket = io();
const btn = document.getElementById('deployBtn');
const statusText = document.getElementById('pullStatus');

socket.on('status-update', (containers) => {
    const list = document.getElementById('status-list');
    list.innerHTML = containers.map(c => \`
    <div class="container-item">
    <div>
    <div class="name">\${c.Names[0].replace('/', '')}</div>
    <div class="status \${c.State === 'running' ? 'running' : 'stopped'}">
    \${c.Status}
    </div>
    </div>
    <button class="stop-btn" onclick="stopContainer('\${c.Id}')">Stop</button>
    </div>
    \`).join('');
});

async function launchDB() {
    const dbType = document.getElementById('dbType').value;
    const port = document.getElementById('port').value;
    if(!port) return alert("Please specify a port!");

    btn.disabled = true;
    btn.innerText = "Processing...";
    statusText.classList.remove('hidden');

    try {
        const response = await fetch('/launch', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ dbType, port, password: 'password123' })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Deploy Database";
        statusText.classList.add('hidden');
    }
}

async function stopContainer(id) {
    await fetch('/stop', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id })
    });
}
</script>
</body>
</html>
`;

// --- BACKEND ROUTES ---

app.get('/', (req, res) => {
    res.send(htmlContent);
});

app.post('/launch', async (req, res) => {
    const { dbType, port, password } = req.body;
    const imageMap = {
        'PostgreSQL': 'postgres:alpine',
        'Redis': 'redis:alpine',
        'MongoDB': 'mongo:latest',
        'Neo4j': 'neo4j:latest'
    };
    const image = imageMap[dbType];

    try {
        console.log(`TetraBase: Checking for image ${image}...`);

        // 1. Pull the image
        await new Promise((resolve, reject) => {
            docker.pull(image, (err, stream) => {
                if (err) return reject(err);
                docker.modem.followProgress(stream, (err, output) => {
                    if (err) return reject(err);
                    resolve(output);
                });
            });
        });

        // 2. Create and start
        const containerName = `${dbType.toLowerCase()}-${Date.now()}`;
        const container = await docker.createContainer({
            Image: image,
            name: containerName,
            ExposedPorts: { [`${port}/tcp`]: {} },
            HostConfig: {
                PortBindings: { [`${port}/tcp`]: [{ HostPort: `${port}` }] }
            },
            Env: dbType === 'PostgreSQL' ? [`POSTGRES_PASSWORD=${password}`] : []
        });

        await container.start();
        console.log(`Launched ${containerName} on port ${port}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Backend Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/stop', async (req, res) => {
    try {
        const container = docker.getContainer(req.body.id);
        await container.stop();
        await container.remove();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update the UI every 2 seconds
setInterval(async () => {
    try {
        const containers = await docker.listContainers({ all: true });
        io.emit('status-update', containers);
    } catch (e) {

    }
}, 2000);

server.listen(3005, () => {
    console.log("TetraBase running at http://localhost:3005");
});
