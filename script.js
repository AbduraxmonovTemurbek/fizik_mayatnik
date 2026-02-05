// Physics Constants and Variables
const CONSTANTS = {
    PI: Math.PI,
    PI_2: Math.PI * 2
};

let state = {
    type: 'math',     // 'math' or 'spring'
    length: 1.0,      // Meters (or Rest Length for spring)
    stiffness: 40,    // N/m (Spring only)
    mass: 1.0,        // kg
    gravity: 9.8,     // m/s^2
    damping: 0.05,    // Damping coefficient
    angle: Math.PI / 6, // Current angle (radians) OR Displacement (meters)
    velocity: 0,      // Angular/Linear velocity
    time: 0,          // Simulation time
    rafId: null,      // Request Animation Frame ID
    isRunning: false,
    initialAngle: Math.PI / 6, // Initial Angle or Displacement
    targetCycles: 10,
    currentCycles: 0,
    crossingCount: 0,
    lastAngle: 0
};

// Canvas Setup
const canvas = document.getElementById('pendulumCanvas');
const ctx = canvas.getContext('2d');
let originX, originY, scale = 300; // Pixels per meter

// Chart Setup
let angleChart;
const chartData = {
    labels: [],
    datasets: [{
        label: 'O\'zgarish',
        data: [],
        borderColor: '#60a5fa',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4
    }]
};

// UI Elements
const els = {
    type: document.getElementById('pendulum-type'),
    stiffness: document.getElementById('stiffness'),
    length: document.getElementById('length'),
    mass: document.getElementById('mass'),
    gravity: document.getElementById('gravity'),
    damping: document.getElementById('damping'),
    angle: document.getElementById('angle'),

    stiffnessVal: document.getElementById('stiffness-val'),
    lengthVal: document.getElementById('length-val'),
    massVal: document.getElementById('mass-val'),
    gravityVal: document.getElementById('gravity-val'),
    dampingVal: document.getElementById('damping-val'),
    angleVal: document.getElementById('angle-val'),

    periodVal: document.getElementById('period-val'),
    frequencyVal: document.getElementById('frequency-val'),
    timeDisplay: document.getElementById('time-display'),
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    resetBtn: document.getElementById('reset-btn'),
    targetCycles: document.getElementById('target-cycles'),
    cycleCount: document.getElementById('cycle-count')
};

function init() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const ctxChart = document.getElementById('angleChart').getContext('2d');
    angleChart = new Chart(ctxChart, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: { display: false },
                y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    els.startBtn.addEventListener('click', startSimulation);
    els.pauseBtn.addEventListener('click', pauseSimulation);
    els.resetBtn.addEventListener('click', resetSimulation);
    document.getElementById('save-btn').addEventListener('click', saveResult);

    // Modals
    setupModal('desc-btn', 'desc-modal');
    setupModal('auth-btn', 'auth-modal');

    // Export
    document.getElementById('export-btn').addEventListener('click', exportTableToCSV);

    // Inputs
    if (els.type) els.type.addEventListener('change', updateParams);
    if (els.stiffness) els.stiffness.addEventListener('input', updateParams);
    els.length.addEventListener('input', updateParams);
    els.mass.addEventListener('input', updateParams);
    els.gravity.addEventListener('input', updateParams);
    els.damping.addEventListener('input', updateParams);
    els.gravity.addEventListener('input', updateParams);
    els.damping.addEventListener('input', updateParams);
    els.angle.addEventListener('input', updateParams);
    if (els.targetCycles) els.targetCycles.addEventListener('input', updateParams);

    updateParams();
    draw();
}

function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    originX = canvas.width / 2;
    originY = 50;
    updateScale();
}

function updateScale() {
    const availableHeight = canvas.height - originY - 60;
    scale = availableHeight / Math.max(state.length, 0.5);
}

function saveResult() {
    // Select ALL tables with the common class
    const tables = document.querySelectorAll('.results-table-common');

    // We can assume the first table's row count is accurate for the N value
    // because we add rows to all of them simultaneously.
    let rowCount = 1;
    if (tables.length > 0) {
        rowCount = tables[0].querySelector('tbody').rows.length + 1;
    }

    const typeName = state.type === 'math' ? 'Matematik' : 'Prujinali';

    const data = [
        rowCount,
        state.targetCycles,
        typeName,
        (state.length * 100).toFixed(0),
        state.mass.toFixed(1),
        state.type === 'spring' ? state.stiffness : state.damping.toFixed(2),
        state.type === 'spring' ? (state.initialAngle * 100).toFixed(1) : (state.initialAngle * 180 / Math.PI).toFixed(1),
        els.periodVal.innerText,
        els.frequencyVal.innerText
    ];

    // Add row to ALL tables
    tables.forEach(table => {
        const tableBody = table.querySelector('tbody');
        const row = tableBody.insertRow();

        data.forEach(text => {
            const cell = row.insertCell();
            cell.innerText = text;
            cell.style.color = 'var(--text-color)';
        });
    });
}

function updateParams(e) {
    if (els.type) state.type = els.type.value;

    const stiffnessGroup = document.getElementById('stiffness-group');
    if (stiffnessGroup) {
        if (state.type === 'spring') {
            stiffnessGroup.style.display = 'block';
            document.querySelector('label[for="angle"]').textContent = "Boshlang'ich siljish x₀ [sm]";
        } else {
            stiffnessGroup.style.display = 'none';
            document.querySelector('label[for="angle"]').textContent = "Boshlang'ich burchak (α₀) [gradus]";
        }
    }

    const newK = els.stiffness ? parseFloat(els.stiffness.value) : 40;
    const newL = parseFloat(els.length.value) / 100;
    const newM = parseFloat(els.mass.value);
    const newG = parseFloat(els.gravity.value);
    const newD = parseFloat(els.damping.value);
    const newInput = parseFloat(els.angle.value);

    state.stiffness = newK;
    state.length = newL;
    state.mass = newM;
    state.gravity = newG;
    state.damping = newD;
    state.targetCycles = els.targetCycles ? parseInt(els.targetCycles.value) : 10;

    if (!state.isRunning && (!e || e.target === els.angle || e.target === els.type || e.target === els.stiffness)) {
        if (state.type === 'spring') {
            // Mapping range values: angle slider is usually -90 to 90.
            // Let's interpret slider value as cm displacement if type is spring?
            // Or better, just map appropriately. 
            // If slider is -90..90, let's just claim it is x0 (cm) -20..20?
            // But HTML max/min is set to 90. 
            // Let's re-map: 90 deg -> 10 cm.
            state.initialAngle = (newInput / 90) * 0.2; // Max 0.2m (20cm)
        } else {
            state.initialAngle = newInput * (Math.PI / 180);
        }
        state.angle = state.initialAngle;
        state.angle = state.initialAngle;
        state.velocity = 0;
        state.time = 0;
        state.currentCycles = 0;
        state.crossingCount = 0;
        state.lastAngle = state.initialAngle;
        if (els.cycleCount) els.cycleCount.innerText = "0";
        chartData.labels = [];
        chartData.datasets[0].data = [];
        angleChart.update();
    }

    if (els.stiffnessVal) els.stiffnessVal.innerText = els.stiffness.value;
    els.lengthVal.innerText = els.length.value;
    els.massVal.innerText = els.mass.value;
    els.gravityVal.innerText = els.gravity.value;
    els.dampingVal.innerText = els.damping.value;
    els.angleVal.innerText = els.angle.value;

    let T = 0;
    if (state.type === 'spring') {
        T = 2 * Math.PI * Math.sqrt(state.mass / state.stiffness);
    } else {
        T = 2 * Math.PI * Math.sqrt(state.length / state.gravity);
    }

    const F = T > 0 ? 1 / T : 0;
    els.periodVal.innerText = T.toFixed(3);
    els.frequencyVal.innerText = F.toFixed(3);

    updateScale();
    if (!state.isRunning) draw();
}

function physicsStep(dt) {
    if (state.type === 'spring') {
        // F = -kx - cv
        const accel = -(state.stiffness / state.mass) * state.angle - (state.damping / state.mass) * state.velocity;
        state.velocity += accel * dt;
        state.angle += state.velocity * dt;
    } else {
        // Pendulum
        const angularAccel = -(state.damping / state.mass) * state.velocity - (state.gravity / state.length) * Math.sin(state.angle);
        state.velocity += angularAccel * dt;
        state.angle += state.velocity * dt;
    }
    state.time += dt;

    // Cycle Counting Logic
    // Detect zero crossing
    // We check if angle passed through 0 (or equilibrium)
    // Actually for spring it's x=0, for pendulum angle=0

    // Check if sign changed
    if ((state.lastAngle > 0 && state.angle <= 0) || (state.lastAngle < 0 && state.angle >= 0)) {
        state.crossingCount++;
        // 2 crossings = 1 period (roughly, depending on start)
        // Usually we start at max amplitude. 
        // Start (Max) -> Cross (0.25T) -> Min -> Cross (0.75T) -> Max (1.0T)
        // So 2nd crossing is at 0.75T. Returning to Max completes it.

        // Let's count full periods based on crossings
        // N = floor(crossings / 2) is a decent approximation for "oscillations completed" 
        // if we consider half-periods.

        // Better: If we start at Max Positive.
        // 1st crossing (Pos to Neg).
        // 2nd crossing (Neg to Pos). This completes one cycle relative to 0.

        if (state.velocity > 0 && state.initialAngle > 0) {
            // If we started positive, and we are crossing upwards (Neg->Pos), that's a cycle end
            // Wait, if initialAngle > 0, initial state is Pos.
            // We want to count when we return to Pos side?
            // Simplest: floor(crossingCount / 2).
        }

        state.currentCycles = Math.floor(state.crossingCount / 2);
        if (els.cycleCount) els.cycleCount.innerText = state.currentCycles;

        if (state.currentCycles >= state.targetCycles) {
            pauseSimulation();
        }
    }
    state.lastAngle = state.angle;
}

let lastTime = 0;
function loop(timestamp) {
    if (!state.isRunning) return;
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    const safeDt = Math.min(dt, 0.1);
    physicsStep(safeDt);

    if (state.time % 0.1 < 0.02) {
        if (chartData.labels.length > 50) {
            chartData.labels.shift();
            chartData.datasets[0].data.shift();
        }
        chartData.labels.push(state.time.toFixed(1));
        chartData.datasets[0].data.push(state.angle);
        angleChart.update('none');
    }

    els.timeDisplay.innerText = state.time.toFixed(2);

    draw();
    state.rafId = requestAnimationFrame(loop);
}

function startSimulation() {
    if (state.isRunning) return;
    state.isRunning = true;
    lastTime = 0;
    state.crossingCount = 0;
    state.currentCycles = 0;
    state.lastAngle = state.angle;
    if (els.cycleCount) els.cycleCount.innerText = "0";
    els.startBtn.style.display = 'none';
    els.pauseBtn.style.display = 'flex';
    state.rafId = requestAnimationFrame(loop);
}
function pauseSimulation() {
    state.isRunning = false;
    cancelAnimationFrame(state.rafId);
    els.startBtn.style.display = 'flex';
    els.pauseBtn.style.display = 'none';
}
function resetSimulation() {
    pauseSimulation();
    state.angle = state.initialAngle;
    state.velocity = 0;
    state.time = 0;
    state.currentCycles = 0;
    state.crossingCount = 0;
    if (els.cycleCount) els.cycleCount.innerText = "0";
    chartData.labels = [];
    chartData.datasets[0].data = [];
    angleChart.update();
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Ceiling/Support
    ctx.beginPath();
    ctx.moveTo(originX - 100, originY);
    ctx.lineTo(originX + 100, originY);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#475569'; // Slate 600
    ctx.stroke();

    // Support Hatching (Diagonal lines)
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#475569';
    for (let x = -100; x < 100; x += 10) {
        ctx.moveTo(originX + x, originY);
        ctx.lineTo(originX + x - 5, originY - 10);
    }
    ctx.stroke();

    if (state.type === 'spring') {
        const coils = 12;
        const width = 20;
        // Base visual length (equilibrium) + displacement
        // Let's make equilibrium visually dependent on Length slider
        const eqLength = state.length * scale;

        // Display Displacement Amplified? or 1:1?
        // Let's do 1:1 if scale is pixels/meter.
        const totalLen = Math.max(10, eqLength + state.angle * scale);

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        for (let i = 0; i <= coils; i++) {
            const y = originY + (totalLen) * (i / coils);
            // Simple zigzag
            const xOffset = (i % 2 === 0) ? -width / 2 : width / 2;
            // First and last points should be center for connection?
            // Simplification:
            let x = originX + xOffset;
            if (i === 0 || i === coils) x = originX;
            ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Mass
        const size = 40;
        ctx.fillStyle = '#60a5fa';
        // Center mass box at end of spring
        ctx.fillRect(originX - size / 2, originY + totalLen, size, size);

        // Draw EQ line (optional)
        // ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        // ctx.beginPath(); ctx.moveTo(0, originY + eqLength); ctx.lineTo(canvas.width, originY + eqLength); ctx.stroke();

    } else {
        // Math Pendulum
        const bobX = originX + Math.sin(state.angle) * state.length * scale;
        const bobY = originY + Math.cos(state.angle) * state.length * scale;

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(bobX, bobY);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(originX, originY, 4, 0, CONSTANTS.PI_2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bobX, bobY, 15 * Math.sqrt(state.mass), 0, CONSTANTS.PI_2);
        const gradient = ctx.createRadialGradient(bobX - 5, bobY - 5, 2, bobX, bobY, 20);
        gradient.addColorStop(0, '#60a5fa');
        gradient.addColorStop(1, '#2563eb');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

init();

// Modal Logic
function setupModal(btnId, modalId) {
    const btn = document.getElementById(btnId);
    const modal = document.getElementById(modalId);
    const span = modal.querySelector('.close-modal');

    if (!btn || !modal || !span) return;

    btn.onclick = () => modal.style.display = "block";
    span.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

// CSV Export Logic
function exportTableToCSV() {
    const table = document.getElementById("results-table-bottom");
    let csv = [];

    for (let i = 0; i < table.rows.length; i++) {
        let row = [], cols = table.rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++)
            row.push(cols[j].innerText);
        csv.push(row.join(","));
    }

    downloadCSV(csv.join("\n"), "tajriba_natijalari.csv");
}

function downloadCSV(csv, filename) {
    let csvFile;
    let downloadLink;

    // CSV file
    csvFile = new Blob([csv], { type: "text/csv" });
    downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
