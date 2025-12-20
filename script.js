const canvas = document.getElementById('gCanvas');
const ctx = canvas.getContext('2d');

let scale = 100;
let offsetX = 0;
let offsetY = 0;

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    drawGraph();
}

function formatNum(num,step) {
    if (step >= 1) {
        return Math.round(num).toString();
    } else if (step >= 0.1) {
        return num.toFixed(1);
    } else if (step >= 0.01) {
        return num.toFixed(2);
    } else {
        return num.toFixed(3);
    }
}

function getGridStep() {
    const tSpacing = 100;
    const rawStep = tSpacing / scale;
    const mag = Math.pow(10,Math.floor(Math.log10(rawStep)));
    const res = rawStep / mag;
    let niceStep;
    if (res <= 1.5) {
        niceStep = 1* mag;
    } else if (res <= 3) {
        niceStep = 2 * mag;
    } else if (res <= 7) {
        niceStep = 5 * mag;
    } else {
        niceStep = 10 * mag;
    }
    return niceStep;
}

function drawGraph() {
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,width,height);
    const centerX = width /2 + offsetX;
    const centerY = height /2 + offsetY;
    const gridStep = getGridStep();
    const gridSize = scale * gridStep;
    const sGridSize = gridSize / 5;
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let x= centerX % sGridSize; x <width; x += sGridSize) {
        ctx.beginPath();
        ctx.moveTo(x,0);
        ctx.lineTo(x,height);
        ctx.stroke();
    }
    for (let y = centerY % sGridSize; y < height; y += sGridSize) {
        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(width,y);
        ctx.stroke();
    }
    ctx.strokeStyle = '#d5d5d5';
    ctx.lineWidth = 1.2;
    for (let x = centerX % gridSize; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x,0);
        ctx.lineTo(x,height);
        ctx.stroke();
    }
    for (let y = centerY % gridSize; y <height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(width,y);
        ctx.stroke();
    }
    ctx.strokeStyle ='#888';
    ctx.lineWidth=2;
    //yaxis
    ctx.beginPath();
    ctx.moveTo(centerX,0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
    //xaxis
    ctx.beginPath();
    ctx.moveTo(0,centerY);
    ctx.lineTo(width,centerY);
    ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.font = '13px Ubuntu';
    //xlabels 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x= centerX % gridSize; x < width; x += gridSize) {
        const unit = (x - centerX) /scale;
        if (Math.abs(unit) > 0.0001) {
            const label = formatNum(unit,gridStep);
            ctx.fillText(label,x,centerY+6);
        }
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    //ylabels
    for (let y = centerY % gridSize; y < height; y += gridSize) {
        const unit = (centerY - y)/scale;
        if (Math.abs(unit) > 0.0001) {
            const label = formatNum(unit,gridStep);
            ctx.fillText(label,centerX - 8, y);
        }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('0',centerX-8,centerY+6);
}

document.querySelectorAll('.control-btn').forEach((btn,idx) => {
    btn.addEventListener('click',() => {
        if (idx === 0) {
            scale *= 1.2;
        } else if (idx === 1) {
            scale /= 1.2;
        } else if (idx === 2) {
            scale = 40;
            offsetX = 0;
            offsetY = 0;
        }
        drawGraph();
    });
});

let isDrg = false;
let lastX,lastY;

canvas.addEventListener('mousedown',(e) => {
    isDrg = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove',(e) => {
    if (isDrg) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        offsetX += dx;
        offsetY += dy;
        lastX = e.clientX;
        lastY = e.clientY;
        drawGraph();
    }
});

canvas.addEventListener('mouseup',() => {
    isDrg = false;
    canvas.style.cursor = 'default';
});

canvas.addEventListener('mouseleave',() => {
    isDrg = false;
    canvas.style.cursor = 'default';
});

canvas.addEventListener('wheel',(e) => {
    e.preventDefault();
    const zoomInt = 0.1;
    const delta = e.deltaY > 0 ? -zoomInt : zoomInt;
    scale *= (1 + delta);
    drawGraph();
});

resizeCanvas();
window.addEventListener('resize',resizeCanvas);

// handle additions via the faded exp
document.getElementById('exp').addEventListener('click', (e) => {
    const clItem = e.target.closest('.exp-item');
    if (!clItem) return;
    if (clItem === clItem.parentElement.lastElementChild) {
        document.querySelectorAll('.exp-item').forEach(i => i.classList.remove('active'));
        clItem.classList.add('active');
        clItem.querySelector('.exp-input').focus();
        const expContainer = document.getElementById('exp');
        const newItem = document.createElement('div');
        newItem.className = 'exp-item';
        const nextNum = expContainer.children.length + 1;
        newItem.innerHTML = `
        <div class="exp-left">
            <span class="exp-num">${nextNum}</span>
        </div>
        <div class="exp-content">
            <input type="text" class="exp-input" placeholder="Type an equation...">
        </div>
        <button class="delete-btn">
            <span class="material-symbols-outlined">close</span>
        </button>`;
        expContainer.appendChild(newItem);
    } else {
        document.querySelectorAll('.exp-item').forEach(i => i.classList.remove('active'));
        clItem.classList.add('active');
        clItem.querySelector('.exp-input').focus();
    }
});

// handle deletions
document.getElementById('exp').addEventListener('click',(e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        e.stopPropagation();
        const item = deleteBtn.closest('.exp-item');
        const expContainer = document.getElementById('exp');
        if (item === expContainer.lastElementChild) {
            return;
        }
        const wasActive = item.classList.contains('active');
        item.remove();
        Array.from(expContainer.children).forEach((expItem,idx) => {
            expItem.querySelector('.exp-num').textContent = idx + 1;
        });
        if (wasActive && expContainer.children.length > 0) {
            expContainer.firstElementChild.classList.add('active');
            expContainer.firstElementChild.querySelector('.exp-input').focus();
        }
    }
});