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

function sflListeners() {
    document.querySelectorAll('math-field').forEach(mf => {
        mf.removeEventListener('focus',handleMFF);
        mf.addEventListener('focus',handleMFF);
        mf.removeEventListener('input',updFunctions);
        mf.addEventListener('input',updFunctions);
        mf.addEventListener('keydown',(e) => {
            if (e.key==='Enter') {
                e.preventDefault();
                handleCommit();
            }
        });
    });
}

function handleCommit() {
    const activeItem = document.querySelector('.exp-item.active');
    if (!activeItem) return;
    const expContainer = document.getElementById('exp');
    const allItems = Array.from(expContainer.children);
    const currIdx = allItems.indexOf(activeItem);
    if (currIdx < allItems.length - 1) {
        allItems[currIdx + 1].click();
    } else {
        activeItem.click();
    }
}

document.addEventListener('click',(e) => {
    if (e.target.closest('[data-command*="commit"')) {
        e.preventDefault();
        e.stopPropagation();
        handleCommit();
    }
},true);

function handleMFF(e) {
    const item = e.target.closest('.exp-item');
    const expContainer = document.getElementById('exp');
    if (item === expContainer.lastElementChild) {
        e.preventDefault();
        e.target.blur();
        return;
    }
    if (item) {
        document.querySelectorAll('.exp-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    }
}

sflListeners();

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

//handle selections and additions via faded exp and exp left
document.getElementById('exp').addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) return;
    const clItem = e.target.closest('.exp-item');
    if (!clItem) return;
    const expContainer = document.getElementById('exp');
    if (clItem === expContainer.lastElementChild) {
        const newItem =document.createElement('div');
        newItem.className = 'exp-item';
        const nextNum = expContainer.children.length + 1;
        newItem.innerHTML = `
        <div class="exp-left">
            <span class="exp-num">${nextNum}</span>
        </div>
        <div class="exp-content">
            <math-field></math-field>
        </div>
        <button class="delete-btn">
            <span class="material-symbols-outlined">close</span>
        </button>`;
        expContainer.appendChild(newItem);
        sflListeners();
        document.querySelectorAll('.exp-item').forEach(i => i.classList.remove('active'));
        clItem.classList.add('active');
        const mathField = clItem.querySelector('math-field');
        if (mathField) {
            setTimeout(() => mathField.focus(),0);
        }
    } else {
        document.querySelectorAll('.exp-item').forEach(i => i.classList.remove('active'));
        clItem.classList.add('active');
        const mathField = clItem.querySelector('math-field');
        if (mathField) {
            setTimeout(() => mathField.focus(),0);
        }
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
            expContainer.firstElementChild.querySelector('math-field').focus();
        }
    }
});

//toolbar btn handling
document.querySelectorAll('.toolbar-btn').forEach((btn,idx) => {
    btn.addEventListener('click',() => {
        if (idx === 0) {
            const expContainer = document.getElementById('exp');
            const lastItem = expContainer.lastElementChild;
            document.querySelectorAll('.exp-item').forEach(i => i.classList.remove('active'));
            lastItem.classList.add('active');
            lastItem.querySelector('math-field').focus();
            const newItem = document.createElement('div');
            newItem.className = 'exp-item';
            const nextNum = expContainer.children.length + 1;
            newItem.innerHTML = `
            <div class="exp-left">
                <span class="exp-num">${nextNum}</span>
            </div>
            <div class="exp-content">
                <math-field></math-field>
            </div>
            <button class="delete-btn">
                <span class="material-symbols-outlined">close</span>
            </button>`;
            expContainer.appendChild(newItem);
            sflListeners();
        }
    });
});

// plotting implementation
let functions = [];

function updFunctions() {
    functions = [];
    const expItems = document.querySelectorAll('.exp-item');
    expItems.forEach((item,idx) => {
        const mathField = item.querySelector('math-field');
        if (!mathField) return;
        if (item === document.getElementById('exp').lastElementChild) return;
        let latex = mathField.value;
        if (!latex || latex.trim() === '') return;
        try {
            let expr;
            let isVertical = false;
            let verticalX = 0;
            //handle equations
            if (latex.includes('=')) {
                const parts = latex.split('=');
                const left = parts[0].trim();
                const right = parts[1].trim();
                if (left === 'y') {
                    expr = right;
                }
                else if(right === 'y') {
                    expr = left;
                }
                else if (left === 'x') {
                    isVertical = true;
                    verticalX = parseFloat(right);
                }
                else if (right === 'x') {
                    isVertical = true;
                    verticalX = parseFloat(left);
                }
                else {
                    expr = right;
                }
            } else {
                expr = latex;
            }
            if (isVertical && !isNaN(verticalX)) {
                functions.push({
                    index: idx,
                    isVertical: true,
                    x: verticalX,
                    latex: latex,
                    colour: getColourIdx(idx)
                });
                return;
            }
            if (!expr) {
                console.log("debug [skipping empty expression]",latex);
                return;
            }
            let mathExpr = expr
                /* had some help from AI here */
                .replace(/\\cdot/g, '*')
                .replace(/\\times/g, '*')
                .replace(/\\div/g, '/')
                .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))')
                .replace(/\^\{([^}]+)\}/g, '^($1)')
                .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
                .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'nthRoot($2, $1)')
                .replace(/\\sin/g, 'sin')
                .replace(/\\cos/g, 'cos')
                .replace(/\\tan/g, 'tan')
                .replace(/\\ln/g, 'log')
                .replace(/\\log/g, 'log10')
                .replace(/\\pi/g, 'pi')
                .replace(/\\left\(|\\right\)/g, '')
                .replace(/\\left\||\\right\|/g, 'abs')
                .replace(/\{|\}/g, '');
            mathExpr = mathExpr.replace(/(\d)([a-zA-Z])/g,'$1*$2');
            mathExpr = mathExpr.replace(/\)([a-zA-Z\d])/g, ')*$1');
            mathExpr = mathExpr.replace(/([a-zA-Z\d])\(/g, '$1*(');
            const compiled = math.compile(mathExpr);
            functions.push({
                index:idx,
                expr:compiled,
                latex:latex,
                colour:getColourIdx(idx)
            });
        } catch (e) {
            console.log('oh no! [error parsing expression]',latex,e);
        }
    });
    drawGraph();
}

function getColourIdx(idx) {
    const colours = [
        "#2d70b3",
        "#e74c3c",
        '#27ae60',
        '#f39c12',
        '#9b59b6',
        '#1abc9c',
        '#e67e22',
        '#34495e'
    ]
    return colours[idx % colours.length];
}

function plotFuncs() {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width/2 + offsetX;
    const centerY = height/2 + offsetY;
    functions.forEach(func => {
        ctx.strokeStyle = func.colour;
        ctx.lineWidth = 2.5;
        if (func.isVertical) {
            const px = centerX + (func.x * scale);
            if (px >= 0 && px <= width) {
                ctx.beginPath();
                ctx.moveTo(px,0);
                ctx.lineTo(px,height);
                ctx.stroke();
            }
            return;
        }
        ctx.beginPath();
        let firstPoint = true;
        let lastY = null;
        for (let px = 0; px < width; px += 0.5) {
            const x = (px - centerX)/scale;
            try {
                const y= func.expr.evaluate({x:x});
                if (typeof y !== 'number' || !isFinite(y)) {
                    firstPoint = true;
                    lastY = null;
                    continue;
                }
                const py = centerY - (y*scale);
                if (lastY !== null && Math.abs(py-lastY) >height/2) {
                    firstPoint = true;
                }
                if (Math.abs(py) < height * 3) {
                    if (firstPoint) {
                        ctx.moveTo(px,py);
                        firstPoint = false;
                    } else {
                        ctx.lineTo(px,py);
                    }
                    lastY = py;
                } else {
                    firstPoint = true;
                    lastY = null;
                }
            } catch (e) {
                firstPoint = true;
                lastY = null;
            }
        }
        ctx.stroke();
    });
}

const ogDrawGraph = drawGraph;
drawGraph = function() {
    ogDrawGraph();
    plotFuncs();
};

updFunctions();