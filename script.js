const canvas = document.getElementById('gCanvas');
const ctx = canvas.getContext('2d');

let scale = 40;
let offsetX = 0;
let offsetY = 0;

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    drawGraph();
}

function drawGraph() {
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,width,height);
    const centerX = width /2 + offsetX;
    const centerY = height /2 + offsetY;
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    for (let x = centerX % scale;x < width; x += scale) {
        ctx.beginPath();
        ctx.moveTo(x,0);
        ctx.lineTo(x,height);
        ctx.stroke();
    }
    for (let y = centerY % scale; y < height;y += scale) {
        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(width,y);
        ctx.stroke();
    }
    ctx.strokeStyle ='#bbb';
    ctx.lineWidth=1.5;
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
    ctx.fillStyle = '#888';
    ctx.font = '11px Ubuntu';
    //xlabels 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x=centerX % scale; x<width; x += scale) {
        const unit = Math.round((x-centerX)/scale);
        if (unit !== 0 && Math.abs(unit) % 1 === 0) {
            ctx.fillText(unit.toString(),x,centerY + 6);
        }
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    //ylabels
    for (let y = centerY % scale; y<height; y+= scale) {
        const unit = Math.round((centerY -y) / scale);
        if (unit !== 0 && Math.abs(unit) % 1 === 0) {
            ctx.fillText(unit.toString(),centerX - 8,y);
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