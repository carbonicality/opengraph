const canvas = document.getElementById('gCanvas');
const ctx = canvas.getContext('2d');

let scale = 100;
let offsetX = 0;
let offsetY = 0;
let functions = [];
let history = [];
let histIdx = -1;
const MAX_HIST = 50;
let isRes = false;
let POIs = [];
let hovPoint = null;

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

canvas.addEventListener('mousemove',(e)=> {
    if (isDrg) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        offsetX += dx;
        offsetY += dy;
        lastX = e.clientX;
        lastY = e.clientY;
        drawGraph();
    } else {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX-rect.left;
        const mouseY = e.clientY-rect.top;
        hovPoint = null;
        const hovRadius = 15;
        for (let poi of POIs) {
            const dx=mouseX-poi.px;
            const dy=mouseY-poi.py;
            const dist =Math.sqrt(dx*dx + dy*dy);
            if (dist <= hovRadius) {
                hovPoint = poi;
                canvas.style.cursor = 'pointer';
                drawGraph();
                return;
            }
        }
        if (canvas.style.cursor === 'pointer') {
            canvas.style.cursor='default';
            drawGraph();
        }
    }
});

canvas.addEventListener('mouseup',() => {
    isDrg = false;
    canvas.style.cursor = 'default';
});

canvas.addEventListener('mouseleave',() => {
    isDrg = false;
    canvas.style.cursor = 'default';
    hovPoint = null;
    drawGraph();
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
        const colour = getColourIdx(nextNum-1);
        newItem.innerHTML = `
        <div class="exp-left">
            <span class="exp-num">${nextNum}</span>
            <div class="colour-ind hidden" style="background-color:${colour};"></div>
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
        if (expContainer.children.length <= 2) {
            const mathField = item.querySelector('math-field');
            if (mathField) {
                mathField.value = '';
                updFunctions();
            }
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
        updFunctions();
    }
});

//toolbar btn handling
document.querySelectorAll('.toolbar-btn').forEach((btn,idx)=> {
    btn.addEventListener('click',()=> {
        if (idx === 0) {
            const expContainer = document.getElementById('exp');
            const lastItem= expContainer.lastElementChild;
            document.querySelectorAll('.exp-item').forEach(i => i.classList.remove('active'));
            lastItem.classList.add('active');
            lastItem.querySelector('math-field').focus();
            const newItem = document.createElement('div');
            newItem.className = 'exp-item';
            const nextNum = expContainer.children.length + 1;
            const colour = getColourIdx(nextNum-1);
            newItem.innerHTML = `
            <div class="exp-left">
                <span class="exp-num">${nextNum}</span>
                <div class="colour-ind" style="background-color:${colour};"></div>
            </div>
            <div class="exp-content">
                <math-field></math-field>
            </div>
            <button class="delete-btn">
                <span class="material-symbols-outlined">close</span>
            </button>`;
            expContainer.appendChild(newItem);
            sflListeners();
            saveState();
        } else if (idx === 1) {
            //menu btn
        } else if (idx === 2) {
            //colpicker btn
        } else if (idx === 3) {
            undo();
        } else if (idx === 4) {
            redo();
        }
    });
});

//some dropdown menu stuff
const menuBtn = document.getElementById('menu-btn');
const menuDrp = document.getElementById('menu-drp');
menuBtn.addEventListener('click',(e)=> {
    e.stopPropagation();
    menuDrp.classList.toggle('show');
});

document.addEventListener('click',(e)=> {
    if (!menuDrp.contains(e.target)&&e.target !== menuBtn) {
        menuDrp.classList.remove('show');
    }
});

document.addEventListener('click',(e)=> {
    if (!menuDrp.contains(e.target)&&e.target!==menuBtn) {
        menuDrp.classList.remove('show');
    }
});

document.getElementById('export').addEventListener('click',()=> {
    menuDrp.classList.remove('show');
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle='#fff';
    tempCtx.fillRect(0,0,tempCanvas.width,tempCanvas.height);
    tempCtx.drawImage(canvas,0,0);
    tempCanvas.toBlob((blob)=>{
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href=url;
        a.download=`opengraph-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});

document.getElementById('save').addEventListener('click',()=>{
    menuDrp.classList.remove('show');
    const sessionData = {
        functions:functions.map(f => ({
            latex:f.latex,
            colour:f.colour,
            index:f.index
        })),
        exps:captureState(),
        scale:scale,
        offsetX:offsetX,
        offsetY:offsetY,
        timestamp:Date.now()
    };
    const json = JSON.stringify(sessionData,null,2);
    const blob = new Blob([json],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opengraph-session-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('load').addEventListener('click',()=>{
    menuDrp.classList.remove('show');
    const input=document.createElement('input');
    input.type='file';
    input.accept='.json';
    input.onchange=(e)=>{
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event)=>{
            try {
                const sessionData = JSON.parse(event.target.result);
                if (sessionData.scale) scale = sessionData.scale;
                if (sessionData.offsetX) offsetX = sessionData.offsetX;
                if (sessionData.offsetY) offsetY = sessionData.offsetY;
                if (sessionData.exps) {
                    restoreState(sessionData.exps);
                }
                drawGraph();
            } catch (error) {
                alert('uh oh! error loading session file, please check the file format.');
                console.error('error loading session file:',error);
            }
        };
        reader.readAsText(file);
    };
    input.click();
});

// plotting implementation
function ltmExpr(expr) {
    expr = expr.replace(/\\placeholder\{\}/g,'');
    let mathExpr = expr
        //had some help from AI for these
        .replace(/\\cdot/g, '*')
        .replace(/\\times/g, '*')
        .replace(/\\div/g, '/')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))')
        .replace(/\\frac\{([^}]*)\}\{?\}?/g, '($1)')
        .replace(/\\frac(\d)(\d)/g, '(($1)/($2))')
        .replace(/\\frac/g, '')
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
    return mathExpr;
}

function plotImplEquation(leftExpr,rightExpr,colour) {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width/2+ offsetX;
    const centerY = height/2+offsetY;
    const step = 3;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2.5;
    const cols = Math.ceil(width/step);
    const rows = Math.ceil(height/step);
    for (let i = 0; i < cols; i++) {
        for (let j = 0;j < rows - 1; j++) {
            const px1 = i * step;
            const py1 = j * step;
            const px2= (i + 1) *step;
            const py2 = (j + 1) *step;
            const corners = [
                {px:px1,py:py1},
                {px:px2,py:py1},
                {px:px2,py:py2},
                {px:px1,py:py2}
            ];
            const vals = corners.map(c => {
                const x = (c.px - centerX)/scale;
                const y = (centerY - c.py)/scale;
                try {
                    const leftVal = leftExpr.evaluate({x:x,y:y});
                    const rightVal = rightExpr.evaluate({x:x,y:y});
                    return leftVal - rightVal;
                } catch (e) {
                    return NaN;
                }
            });
            if (vals.some(v => !isFinite(v))) continue;
            const signs = vals.map(v => v > 0 ? 1 : -1);
            const hsChange = signs.some((s,idx) => s !== signs[0]);
            if (hsChange) {
                const thresh = 0.05;
                const edges = [];
                if (signs[0] !== signs[1]) {
                    const t = Math.abs(vals[0])/(Math.abs(vals[0])+Math.abs(vals[1]));
                    edges.push({px:px1 + t*step,py:py1});
                }
                if (signs[1] !== signs[2]) {
                    const t = Math.abs(vals[1]/(Math.abs(vals[1])+Math.abs(vals[3])));
                    edges.push({px:px2,py:py1 + t *step});
                }
                if (signs[2] !== signs[3]) {
                    const t = Math.abs(vals[2])/(Math.abs(vals[2]) + Math.abs(vals[3]));
                    edges.push({px:px2 - t* step, py: py2});
                }
                if (signs[3] !== signs[0]) {
                    const t= Math.abs(vals[3]/(Math.abs(vals[3]) + Math.abs(vals[0])));
                    edges.push({px:px1,py:py2 - t * step});
                }
                if (edges.length >= 2) {
                    ctx.beginPath();
                    ctx.moveTo(edges[0].px,edges[0].py);
                    for (let k = 1; k < edges.length; k++) {
                        ctx.lineTo(edges[k].px,edges[k].py);
                    }
                    ctx.stroke();
                }
            }
        }
    }
}

function plotImplLinear(leftExpr,rightExpr,colour) {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width/2 + offsetX;
    const centerY = height/2 + offsetY;
    try {
        const p1 = {x:0,y:0};
        const p2 = {x:1,y:0};
        const p3 = {x:0,y:1};
        const left1 = leftExpr.evaluate(p1);
        const right1 = rightExpr.evaluate(p1);
        const left2 = leftExpr.evaluate(p2);
        const right2 = rightExpr.evaluate(p2);
        const left3 = leftExpr.evaluate(p3);
        const right3 = rightExpr.evaluate(p3);
        const f1 = left1 - right1;
        const f2 = left2 - right2;
        const f3 = left3 - right3;
        const a = f2 - f1;
        const b = f3 - f1;
        const c = f1;
        const testP = {x:2,y:3};
        const testLeft = leftExpr.evaluate(testP);
        const testRight = rightExpr.evaluate(testP);
        const testF = testLeft - testRight;
        const expF = a*2 + b*3 + c;
        if (Math.abs(testF - expF) < 0.0001) {
            ctx.strokeStyle = colour;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            if (Math.abs(b) > 0.001) {
                const y1 = (-a * ((0 - centerX)/scale) - c)/b;
                const y2 = (-a * ((width - centerX)/scale) -c)/b;
                const py1 = centerY - y1 *scale;
                const py2 = centerY - y2 *scale;
                ctx.moveTo(0,py1);
                ctx.lineTo(width,py2);
            } else if (Math.abs(a) > 0.001) {
                const x = -c/a;
                const px = centerX + x * scale;
                ctx.moveTo(px,0);
                ctx.lineTo(px,height);
            }
            ctx.stroke();
            return true;
        }
    } catch (e) {
        //not linear, fallback to implicit
        console.log('falling back to implicit');
    }
    return false;
}

function updFunctions() {
    functions = [];
    const expItems = document.querySelectorAll('.exp-item');
    expItems.forEach((item,idx) => {
        const mathField = item.querySelector('math-field');
        if (!mathField) return;
        if (item === document.getElementById('exp').lastElementChild) return;
        let latex = mathField.value;
        const colourInd = item.querySelector('.colour-ind');
        if (!latex || latex.trim() === '') {
            if (colourInd) colourInd.classList.add('hidden');
            return;
        }
        try {
            let expr;
            let isVertical = false;
            let verticalX = 0;
            let hasVFunc = false;
            //handle equations
            if (latex.includes('=')) {
                const parts = latex.split('=');
                const left = parts[0].trim();
                const right = parts[1].trim();
                if (left === 'y') {
                    expr = right;
                    hasVFunc = true;
                }
                else if (right === 'y') {
                    expr = left;
                    hasVFunc = true;
                }
                else if (left === 'x' && !right.includes('y')){
                    isVertical = true;
                    verticalX = parseFloat(right);
                    hasVFunc = !isNaN(verticalX);
                }
                else if (right === 'x' && !left.includes('y')) {
                    isVertical = true;
                    verticalX = parseFloat(left);
                    hasVFunc = !isNaN(verticalX);
                } else {
                    try {
                        const leftM = ltmExpr(left);
                        const rightM = ltmExpr(right);
                        const leftCpl = math.compile(leftM);
                        const rightCpl = math.compile(rightM);
                        functions.push({
                            index:idx,
                            isImpl:true,
                            leftExpr:leftCpl,
                            rightExpr:rightCpl,
                            latex:latex,
                            colour:getColourIdx(idx)
                        });
                        if (colourInd) colourInd.classList.remove('hidden');
                        return;
                    } catch (e) {
                        console.log("uh oh - [couldn't compile impl equation]",latex,e);
                        if (colourInd) colourInd.classList.add('hidden');
                        return;
                    }
                }
            } else {
                expr = latex;
                hasVFunc = true;
            }
            if (isVertical && !isNaN(verticalX)) {
                functions.push({
                    index:idx,
                    isVertical:true,
                    x:verticalX,
                    latex:latex,
                    colour:getColourIdx(idx)
                });
                if (colourInd) colourInd.classList.remove('hidden');
                return;
            }
            if (!expr) {
                if (colourInd) colourInd.classList.add('hidden');
                return;
            }
            let mathExpr= ltmExpr(expr);
            const compiled = math.compile(mathExpr);
            functions.push({
                index:idx,
                expr:compiled,
                latex:latex,
                colour:getColourIdx(idx)
            });
            if (colourInd) colourInd.classList.remove('hidden');
        } catch (e) {
            console.log('oh no! [error parsing expression]',latex,e);
            const colourInd = item.querySelector('.colour-ind');
            if (colourInd) colourInd.classList.add('hidden');
        }
    });
    drawGraph();
    if (!isRes) {
        saveState();
    }
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
    POIs = [];
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
        let firstPoint = true;
        let lastY = null;
        if (func.isImpl) {
            const isLinear = plotImplLinear(func.leftExpr,func.rightExpr,func.colour);
            if (!isLinear) {
                plotImplEquation(func.leftExpr,func.rightExpr,func.colour);
            }
            try {
                let y1 = -100;
                let y2 = 100;
                const f1 = func.leftExpr.evaluate({x:0,y:y1}) - func.rightExpr.evaluate({x:0,y:y1});
                const f2 = func.leftExpr.evaluate({x:0,y:y2}) - func.rightExpr.evaluate({x:0,y:y2});
                if (Math.sign(f1) !== Math.sign(f2)) {
                    for (let i = 0; i < 30; i++) {
                        const yMid = (y1+y2)/2;
                        const leftVal = func.leftExpr.evaluate({x:0,y:yMid});
                        const rightVal = func.rightExpr.evaluate({x:0,y:yMid});
                        const diff = leftVal - rightVal;
                        if (Math.abs(diff) < 0.0001) {
                            const py = centerY - (yMid * scale);
                            if (py >= -20 && py <= height + 20) {
                                ctx.fillStyle = func.colour;
                                ctx.beginPath();
                                ctx.arc(centerX,py,5,0,Math.PI*2);
                                ctx.fill();
                                POIs.push({
                                    x:0,
                                    y:yMid,
                                    px:centerX,
                                    py:py,
                                    type:'y-intercept',
                                    colour:func.colour,
                                    funcIdx:func.index
                                });
                            }
                            break;
                        }
                        if (Math.sign(diff) === Math.sign(f1)) {
                            y1 = yMid;
                        } else {
                            y2 = yMid;
                        }
                    }
                }
            } catch (e) {}
        try {
            let x1 = -100;
            let x2 = 100;
            const f1 = func.leftExpr.evaluate({x:x1,y:0}) - func.rightExpr.evaluate({x:x1,y:0});
            const f2 = func.leftExpr.evaluate({x:x2,y:0}) - func.rightExpr.evaluate({x:x2,y:0});
            if (Math.sign(f1) !== Math.sign(f2)) {
                for (let i = 0; i < 30; i++) {
                    const xMid = (x1 + x2) /2;
                    const leftVal = func.leftExpr.evaluate({x:xMid,y:0});
                    const rightVal = func.rightExpr.evaluate({x:xMid,y:0});
                    const diff = leftVal-rightVal;
                    if (Math.abs(diff) < 0.0001) {
                        const px = centerX + (xMid * scale);
                        if (px >= -20 && px <= width + 20) {
                            ctx.fillStyle = func.colour;
                            ctx.beginPath();
                            ctx.arc(px,centerY,5,0,Math.PI*2);
                            ctx.fill();
                            POIs.push({
                                x:xMid,
                                y:0,
                                px:px,
                                py:centerY,
                                type:'x-intercept',
                                colour:func.colour,
                                funcIdx:func.index
                            });
                        }
                        break;
                    }
                    if (Math.sign(diff) === Math.sign(f1)) {
                        x1 = xMid;
                    } else {
                        x2 = xMid;
                    }
                }
            } 
        } catch(e) {}
        return;
    }
        ctx.beginPath();
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
        try {
            const yInt = func.expr.evaluate({x:0});
            if (typeof yInt === 'number' && isFinite(yInt)) {
                const py = centerY - (yInt * scale);
                if (py >= -20 && py <= height + 20) {
                    ctx.fillStyle = func.colour;
                    ctx.beginPath();
                    ctx.arc(centerX,py,5,0,Math.PI *2);
                    ctx.fill();
                    POIs.push({
                        x:0,
                        y:yInt,
                        px:centerX,
                        py:py,
                        type:'y-intercept',
                        colour:func.colour,
                        funcIdx:func.index
                    });
                }
            }
        } catch (e) {
            //no yint for this function
        }
        try {
            const srchRange = width/scale;
            const step = 0.05;
            let lastY = null;
            let lastX = null;
            for (let x = -srchRange; x <= srchRange; x+= step) {
                try {
                    const y = func.expr.evaluate({x:x});
                    if (typeof y === 'number' && isFinite(y)) {
                        if (lastY !== null) {
                            if (Math.sign(lastY) !== Math.sign(y) && lastY !== 0 && y !== 0) {
                                let x1 = lastX;
                                let x2 = x;
                                for (let i=0;i<20;i++) {
                                    const xMid = (x1+x2)/2;
                                    const yMid = func.expr.evaluate({x:xMid});
                                    if (Math.abs(yMid) < 0.0001) {
                                        const px = centerX+(xMid*scale);
                                        if (px >= -20 && px <= width + 20) {
                                            ctx.fillStyle = func.colour;
                                            ctx.beginPath();
                                            ctx.arc(px,centerY,5,0,Math.PI*2);
                                            ctx.fill();
                                            POIs.push({
                                                x:xMid,
                                                y:0,
                                                px:px,
                                                py:centerY,
                                                type:'x-intercept',
                                                colour:func.colour,
                                                funcIdx:func.index
                                            });
                                        }
                                        break;
                                    }
                                    if (Math.sign(yMid) === Math.sign(lastY)) {
                                        x1 = xMid;
                                    } else {
                                        x2 = xMid;
                                    }
                                }
                            }
                        }
                        lastY=y;
                        lastX=x;
                    } else {
                        lastY = null;
                        lastX = null;
                    }
                } catch (e) {
                    lastY = null;
                    lastX = null;
                }
            }
        } catch (e) {
            //no x-ints found
        }
    });
    if (hovPoint) {
        drawTooltip(hovPoint);
    }
}

const ogDrawGraph = drawGraph;
drawGraph = function() {
    ogDrawGraph();
    plotFuncs();
};

//handle custom kb toggle button too
document.querySelector('.kb-toggle-btn').addEventListener('click',() => {
    const activeItem = document.querySelector('.exp-item.active');
    if (!activeItem) {
        const firstItem = document.querySelector('.exp-item');
        if (firstItem) {
            firstItem.classList.add('active');
            const mathField = firstItem.querySelector('math-field');
            if (mathField) {
                mathField.focus();
                if (mathField.virtualKeyboardMode === 'off') {
                    mathField.executeCommand('showVirtualKeyboard');
                } else {
                    mathField.executeCommand('hideVirtualKeyboard');
                }
            }
        }
        return;
    }
    const mathField = activeItem.querySelector('math-field');
    if (mathField) {
        mathField.focus();
        if (mathField.virtualKeyboardMode === 'off' || !window.mathVirtualKeyboard.visible) {
            mathField.executeCommand('showVirtualKeyboard');
        } else {
            mathField.executeCommand('hideVirtualKeyboard');
        }
    }
});

const updKBText = () => {
    const btn = document.querySelector('.kb-toggle-btn span:not(.material-symbols-outlined)');
    if (window.mathVirtualKeyboard && window.mathVirtualKeyboard.visible) {
        btn.textContent = 'Close math keyboard';
    } else {
        btn.textContent = 'Open math keyboard';
    }
};

if (window.mathVirtualKeyboard) {
    window.mathVirtualKeyboard.addEventListener('geometrychange',updKBText);
}

//undo and redo stuff
function captureState() {
    const expContainer = document.getElementById('exp');
    const items = Array.from(expContainer.children);
    const state = items.map((item,idx) => {
        const mathField = item.querySelector('math-field');
        const isActive = item.classList.contains('active');
        return {
            latex: mathField ? mathField.value : '',
            isActive: isActive
        };
    });
    return JSON.stringify(state);
}

function saveState() {
    if (isRes) return;
    const curState = captureState();
    if (histIdx >= 0 && history[histIdx] === curState) {
        return;
    }
    history = history.slice(0,histIdx + 1);
    history.push(curState);
    if (history.length > MAX_HIST) {
        history.shift();
    } else {
        histIdx++;
    }
    updURButtons();
}

function restoreState(stateStr) {
    isRes = true;
    const state = JSON.parse(stateStr);
    const expContainer = document.getElementById('exp');
    expContainer.innerHTML='';
    state.forEach((itemState,idx) => {
        const newItem = document.createElement('div');
        const colour = getColourIdx(idx);
        newItem.className = 'exp-item';
        if (itemState.isActive) {
            newItem.classList.add('active');
        }
        newItem.innerHTML = `
        <div class="exp-left">
            <span class="exp-num">${idx+1}</span>
            <div class="colour-ind hidden" style="background-color:${colour};"></div>
        </div>
        <div class="exp-content">
            <math-field></math-field>
        </div>
        <button class="delete-btn">
            <span class="material-symbols-outlined">close</span>
        </button>`;
        expContainer.appendChild(newItem);
        const mathField = newItem.querySelector('math-field');
        if (mathField && itemState.latex) {
            mathField.value = itemState.latex;
        }
    });
    sflListeners();
    const activeItem = document.querySelector('.exp-item.active');
    if (activeItem) {
        const mathField = activeItem.querySelector('math-field');
        if (mathField) {
            setTimeout(() => mathField.focus(),0);
        }
    }
    functions =[];
    const expItems = document.querySelectorAll('.exp-item');
    expItems.forEach((item,idx) => {
        const mathField = item.querySelector('math-field');
        if (!mathField) return;
        if (item === document.getElementById('exp').lastElementChild) return;
        let latex= mathField.value;
        if (!latex || latex.trim() === '') return;
        try{
            let expr;
            let isVertical = false;
            let verticalX= 0;
            if (latex.includes('=')) {
                const parts = latex.split('=');
                const left = parts[0].trim();
                const right = parts[1].trim();
                if (left === 'y') {
                    expr=right;
                }
                else if (right === 'y') {
                    expr=left;
                }
                else if (left === 'x' && !right.includes('y')) {
                    isVertical = true;
                    verticalX = parseFloat(right);
                }
                else if (right === 'x' && !left.includes('y')) {
                    isVertical = true;
                    verticalX = parseFloat(left);
                } else {
                    try {
                        const leftM = ltmExpr(left);
                        const rightM = ltmExpr(right);
                        const leftCpl = math.compile(leftM);
                        const rightCpl = math.compile(rightM);
                        functions.push({
                            index:idx,
                            isImpl:true,
                            leftExpr:leftCpl,
                            rightExpr:rightCpl,
                            latex:latex,
                            colour:getColourIdx(idx)
                        });
                        return;
                    } catch (e) {
                        console.log("uh oh - [could'nt compile impl equation]",latex,e);
                        return;
                    }
                }
            } else {
                expr = latex;
            }
            if (isVertical && !isNaN(verticalX)) {
                functions.push({
                    index:idx,
                    isVertical:true,
                    x:verticalX,
                    latex:latex,
                    colour:getColourIdx(idx)
                });
                return;
            }
            if (!expr) {
                return;
            }
            let mathExpr=ltmExpr(expr);
            const compiled = math.compile(mathExpr);
            functions.push({
                index:idx,
                expr:compiled,
                latex:latex,
                colour:getColourIdx(idx)
            });
        } catch (e) {
            console.log('oh no! [error parsing exp]',latex,e);
        }
    });
    drawGraph();
    isRes = false;
    updURButtons();
}

function undo() {
    if (histIdx > 0) {
        histIdx--;
        restoreState(history[histIdx]);
    }
}

function redo() {
    if (histIdx <history.length -1) {
        histIdx++;
        restoreState(history[histIdx]);
    }
}

function updURButtons() {
    const toolbarBtns = document.querySelectorAll('.toolbar-btn');
    const undoBtn = toolbarBtns[2];
    const redoBtn = toolbarBtns[3];
    if (undoBtn) {
        if (histIdx >0) {
            undoBtn.style.opacity = '1';
            undoBtn.style.cursor = 'pointer';
            undoBtn.disabled = false;
        } else {
            undoBtn.style.opacity = '0.3';
            undoBtn.style.cursor = 'not-allowed';
            undoBtn.disabled=true;
        }
    }
    if (redoBtn) {
        if (histIdx < history.length -1) {
            redoBtn.style.opacity='1';
            redoBtn.style.cursor='pointer';
            redoBtn.disabled=false;
        } else {
            redoBtn.style.opacity = '0.3';
            redoBtn.style.cursor = 'not-allowed';
            redoBtn.disabled =true;
        }
    }
}

setTimeout(() => {
    saveState();
},100);

document.addEventListener('keydown',(e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z'&& !e.shiftKey) {
        e.preventDefault();
        undo();
    }
    if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        redo();
    }
});

function drawTooltip(point) {
    const padding=8;
    const lnHeight = 18;
    const xLabel = `x: ${point.x.toFixed(3)}`;
    const yLabel = `y: ${point.y.toFixed(3)}`;
    const typeLabel = point.type.replace('-',' ');
    ctx.font='13px Ubuntu';
    const xWidth = ctx.measureText(xLabel).width;
    const yWidth = ctx.measureText(yLabel).width;
    const typeWidth = ctx.measureText(typeLabel).width;
    const maxWidth = Math.max(xWidth,yWidth,typeWidth);
    const tooltipWidth = maxWidth+padding*2;
    const tooltipHeight = lnHeight*3 + padding*2;
    let tooltipX = point.px + 15;
    let tooltipY = point.py - tooltipHeight-15;
    if (tooltipX+tooltipWidth>canvas.width-10) {
        tooltipX=point.px-tooltipWidth-15;
    }
    if (tooltipY < 10) {
        tooltipY=point.py+15;
    }
    ctx.fillStyle = 'rgba(50,50,50,0.95)';
    ctx.strokeStyle=point.colour;
    ctx.lineWidth=2;
    const radius = 4;

    ctx.beginPath();
    ctx.moveTo(tooltipX+radius,tooltipY);
    ctx.lineTo(tooltipX+tooltipWidth-radius,tooltipY);
    ctx.quadraticCurveTo(tooltipX+tooltipWidth,tooltipY,tooltipX+tooltipWidth,tooltipY+radius);
    ctx.lineTo(tooltipX+tooltipWidth,tooltipY+tooltipHeight-radius);
    ctx.quadraticCurveTo(tooltipX+tooltipWidth,tooltipY+tooltipHeight,tooltipX+tooltipWidth-radius,tooltipY+tooltipHeight);
    ctx.lineTo(tooltipX+radius,tooltipY+tooltipHeight);
    ctx.quadraticCurveTo(tooltipX,tooltipY+tooltipHeight,tooltipX,tooltipY+tooltipHeight-radius);
    ctx.lineTo(tooltipX,tooltipY+radius);
    ctx.quadraticCurveTo(tooltipX,tooltipY,tooltipX+radius,tooltipY);
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle='#fff';
    ctx.textAlign='left';
    ctx.textBaseline = 'top';
    ctx.fillText(typeLabel,tooltipX+padding,tooltipY+padding);
    ctx.fillText(xLabel,tooltipX+padding,tooltipY+padding+lnHeight);
    ctx.fillText(yLabel,tooltipX+padding,tooltipY+padding+lnHeight*2);
    
    ctx.fillStyle=point.colour;
    ctx.strokeStyle='#fff';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(point.px,point.py,7,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
}

//colpicker functionality
const colpickerBtn = document.getElementById('colpicker');
const colpickerPnl = document.getElementById('colpicker-pnl');
const colpickerFuncs = document.getElementById('colpicker-funcs');
const colpickerPS = document.getElementById('colpreset-section');
const customColInp = document.getElementById('custom-col-in');

colpickerBtn.addEventListener('click',(e)=>{
    e.stopPropagation();
    menuDrp.classList.remove('show');
    colpickerFuncs.innerHTML = '';
    const expItems = document.querySelectorAll('.exp-item');
    expItems.forEach((item,idx)=> {
        if (item === document.getElementById('exp').lastElementChild) return;
        const mathField = item.querySelector('math-field');
        if (!mathField || !mathField.value) return;
        const func = functions.find(f => f.index === idx);
        if (!func) return;
        const funcItem = document.createElement('div');
        funcItem.className = 'colpicker-item';
        funcItem.innerHTML = `
        <span class="exp-num">${idx+1}</span>
        <div class="colswatch" style="background-color:${func.colour};"></div>
        <div class="func-preview">${mathField.value}</div>`;
        funcItem.addEventListener('click',()=>{
            selFuncIdx = idx;
            colpickerPS.style.display='block';
            document.querySelectorAll('.colpicker-item').forEach(i => {
                i.style.background='';
            });
            funcItem.style.background='rgba(45,112,179,0.08)';
        });
        colpickerFuncs.appendChild(funcItem);
    });
    colpickerPnl.classList.toggle('show');
    colpickerPS.style.display ='none';
    selFuncIdx=null;
});

document.addEventListener('click',(e)=> {
    if (!colpickerPnl.contains(e.target) && e.target !== colpickerBtn) {
        colpickerPnl.classList.remove('show');
    }
});

document.querySelectorAll('.colpreset').forEach(preset => {
    preset.addEventListener('click',()=> {
        if (selFuncIdx === null) return;
        const colour = preset.getAttribute('data-color');
        applyColFunc(selFuncIdx,colour);
        colpickerPnl.classList.remove('show')
    });
});

customColInp.addEventListener('change',(e)=>{
    if (selFuncIdx === null) return;
    applyColFunc(selFuncIdx,e.target.value);
    colpickerPnl.classList.remove('show');
});

function applyColFunc(funcIndex,colour) {
    const func = functions.find(f => f.index === funcIndex);
    if (func) {
        func.colour = colour;
    }
    const expItems = document.querySelectorAll('.exp-item');
    const targetItem = expItems[funcIndex];
    if (targetItem) {
        const colourInd = targetItem.querySelector('.colour-ind');
        if (colourInd) {
            colourInd.style.backgroundColor = colour;
        }
    }
    drawGraph();
    if (!isRes) {
        saveState();
    }
}

updFunctions();