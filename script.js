const canvas = document.getElementById('gCanvas');
const ctx = canvas.getContext('2d');

let scale = 100;
let offsetX = 0;
let offsetY = 0;
let functions = [];
let history = [];
let histIdx = -1;
let isRes = false;
let POIs = [];
let hovPoint = null;
let traceMode = false;
let tracePoint = null;
let params = {};
let paramListeners =[];
let showGrid = true;
let inters=[];
let funcHistory=[];
const MAX_HIST=10;

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
        mf.removeEventListener('blur',handleBlur);
        mf.addEventListener('blur',handleBlur);
        mf.addEventListener('keydown',(e) => {
            if (e.key==='Enter') {
                e.preventDefault();
                handleCommit();
            }
        });
    });
}

function handleBlur(e) {
    const item=e.target.closest('.exp-item');
    const expContainer=document.getElementById('exp');
    if (item === expContainer.lastElementChild)return;
    const mathField=e.target;
    const latex=mathField.value;
    if (latex && latex.trim() !== '') {
        const itemIdx = Array.from(expContainer.children).indexOf(item);
        const func = functions.find(f => f.index === itemIdx);
        if (func && func.latex && func.colour) {
            saveHist(func.latex,func.colour);
        }
    }
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
    const gridSize = scale*gridStep;
    if (showGrid) { 
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
    if (showGrid) {
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
        const dx = e.clientX-lastX;
        const dy= e.clientY-lastY;
        offsetX += dx;
        offsetY += dy;
        lastX = e.clientX;
        lastY = e.clientY;
        drawGraph();
    } else {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX-rect.left;
        const mouseY = e.clientY-rect.top;
        const centerX = canvas.width/2+offsetX;
        const centerY=canvas.height/2+offsetY;
        hovPoint=null;
        const hovRadius=15;
        for (let poi of POIs) {
            const dx = mouseX-poi.px;
            const dy = mouseY-poi.py;
            const dist = Math.sqrt(dx*dx+dy*dy);
            if (dist <= hovRadius) {
                hovPoint=poi;
                canvas.style.cursor='pointer';
                drawGraph();
                return;
            }
        }
        if (traceMode) {
            let cPoint = null;
            let minDist = 20;
            const mouseXCoord = (mouseX-centerX)/scale;
            const mouseYCoord = (centerY-mouseY)/scale;
            functions.forEach(func => {
                if (func.isVertical) {
                    const px = centerX+func.x*scale;
                    const distX = Math.abs(mouseX-px);
                    if (distX<minDist) {
                        minDist = distX;
                        cPoint = {
                            x:func.x,
                            y:mouseYCoord,
                            px:px,
                            py:mouseY,
                            colour:func.colour,
                            funcIdx:func.index,
                            latex:func.latex
                        };
                    }
                    return;
                }
                if (func.isImpl) return;
                try {
                    const y=func.expr.evaluate({x:mouseXCoord});
                    if (typeof y==='number'&&isFinite(y)) {
                        const py = centerY-y*scale;
                        const dist=Math.abs(mouseY-py);
                        if (dist<minDist) {
                            minDist = dist;
                            cPoint = {
                                x:mouseXCoord,
                                y:y,
                                px:mouseX,
                                py:py,
                                colour:func.colour,
                                funcIdx:func.index,
                                latex:func.latex
                            };
                        }
                    }
                } catch (e) {}
            });
            if (cPoint) {
                tracePoint=cPoint;
                canvas.style.cursor='crosshair';
            } else {
                tracePoint=null;
                canvas.style.cursor='default';
            }
            if (func.isPolar) {
                let cTheta = null;
                let minDist = 20;
                for (let theta = 0; theta<=Math.PI*4;theta+=0.05) {
                    try {
                        const r = func.expr.evaluate({theta:theta,θ:theta});
                        if (!isFinite(r)) continue;
                        const x = r*Math.cos(theta);
                        const y = r*Math.sin(theta);
                        const px = centerX+x*scale;
                        const py = centerY-y*scale;
                        const dist = Math.sqrt(Math.pow(mouseX-px,2)+Math.pow(mouseY-py,2));
                        if (dist<minDist) {
                            minDist = dist;
                            cTheta = theta;
                        }
                    } catch (e) {}
                }
                if (cTheta !== null) {
                    try {
                        const r = func.expr.evaluate({theta:cTheta,θ:cTheta});
                        const x = r*Math.cos(cTheta);
                        const y = r*Math.sin(cTheta);
                        const px=centerX+x*scale;
                        const py=centerY-y*scale;
                        cPoint = {
                            x:x,
                            y:y,
                            px:px,
                            py:py,
                            colour:func.colour,
                            funcIdx:func.index,
                            latex:func.latex,
                            isPolar:true,
                            theta:cTheta,
                            r:r
                        };
                    } catch (e) {}
                }
                return;
            }
            drawGraph();
            return;
        }
        if (canvas.style.cursor==='pointer' || canvas.style.cursor==='crosshair') {
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
        <button class="dupe-btn">
            <span class="material-symbols-outlined">content_copy</span>
        </button>
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

//handle duplications
document.getElementById('exp').addEventListener('click',(e) => {
    const dupeBtn = e.target.closest('.dupe-btn');
    if (dupeBtn) {
        e.stopPropagation();
        const item = dupeBtn.closest('.exp-item');
        const expContainer = document.getElementById('exp');
        if (item === expContainer.lastElementChild) {
            return;
        }
        const mathField = item.querySelector('math-field');
        const latex = mathField?mathField.value:'';
        const currentFunc=functions.find(f => f.index===Array.from(expContainer.children).indexOf(item));
        const newItem = document.createElement('div');
        newItem.className = 'exp-item';
        const allItems = Array.from(expContainer.children);
        const insertIdx = allItems.indexOf(item)+1;
        const nextNum=insertIdx+1;
        const colour = currentFunc ?currentFunc.colour:getColourIdx(insertIdx);
        newItem.innerHTML = `
        <div class="exp-left">
            <span class="exp-num">${nextNum}</span>
            <div class="colour-ind ${latex?'':'hidden'}" style="background-color=${colour};"></div>
        </div>
        <div class="exp-content">
            <math-field></math-field>
        </div>
        <button class="dupe-btn" title="Duplicate">
            <span class="material-symbols-outlined">content_copy</span>
        </button>
        <button class="delete-btn">
            <span class="material-symbols-outlined">close</span>
        </button>`;
        if (insertIdx <allItems.length) {
            expContainer.insertBefore(newItem,allItems[insertIdx]);
        } else {
            expContainer.appendChild(newItem);
        }
        const nMathField = newItem.querySelector('math-field');
        if (nMathField && latex) {
            nMathField.value=latex;
        }
        Array.from(expContainer.children).forEach((expItem,idx)=>{
            expItem.querySelector('.exp-num').textContent=idx+1;
        });
        sflListeners();
        updFunctions();
        document.querySelectorAll('.exp-item').forEach(i => i.classList.remove('active'));
        newItem.classList.add('active');
        if (nMathField) {
            setTimeout(()=>nMathField.focus(),0);
        }
    }
})

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
            <button class="dupe-btn">
                <span class="material-symbols-outlined">content_copy</span>
            </button>
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
            traceMode = !traceMode;
            const traceBtn = document.getElementById('trace-btn');
            if (traceMode) {
                traceBtn.style.background='rgba(45,112,179,0.2)';
            } else {
                traceBtn.style.background='transparent';
                tracePoint=null;
                canvas.style.cursor='default';
                drawGraph();
            }
        } else if (idx === 4) {
            undo();
        } else if (idx === 5) {
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
        .replace(/\\cot/g, 'cot')
        .replace(/\\sec/g, 'sec')
        .replace(/\\csc/g, 'csc')
        .replace(/\\arcsin/g, 'asin')
        .replace(/\\arccos/g, 'acos')
        .replace(/\\arctan/g, 'atan')
        .replace(/\\sinh/g, 'sinh')
        .replace(/\\cosh/g, 'cosh')
        .replace(/\\tanh/g, 'tanh')
        .replace(/\\ln/g, 'log')
        .replace(/\\log/g, 'log10')
        .replace(/\\pi/g, 'pi')
        .replace(/\\phi/g, 'phi')
        .replace(/\\theta/g, 'theta')
        .replace(/\\alpha/g, 'alpha')
        .replace(/\\beta/g, 'beta')
        .replace(/\\gamma/g, 'gamma')
        .replace(/\\delta/g, 'delta')
        .replace(/\\epsilon/g, 'epsilon')
        .replace(/\\tau/g, 'tau')
        .replace(/\\left\(/g, '(')
        .replace(/\\right\)/g, ')')
        .replace(/\\left\||\\right\|/g, 'abs')
        .replace(/\\left\[|\\right\]/g, '')
        .replace(/\\floor/g, 'floor')
        .replace(/\\ceil/g, 'ceil')
        .replace(/\\max/g, 'max')
        .replace(/\\min/g, 'min')
        .replace(/θ/g, 'theta')
        .replace(/\{|\}/g, '');
    mathExpr = mathExpr.replace(/(\d)([a-zA-Z])/g,'$1*$2');
    mathExpr = mathExpr.replace(/\)([a-zA-Z\d])/g, ')*$1');
    const funcNames = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'asin', 'acos', 'atan', 
                      'sinh', 'cosh', 'tanh', 'log', 'log10', 'sqrt', 'abs', 'floor', 
                      'ceil', 'max', 'min', 'nthRoot']; // asked AI for this stuff
    mathExpr = mathExpr.replace(/([a-zA-Z\d])\(/g,(match,p1,offset)=> {
        for (let func of funcNames) {
            const startPos=offset-(func.length-p1.length);
            if (startPos >= 0 && mathExpr.substring(startPos,offset+p1.length)===func) {
                return match;
            }
        }
        return p1+'*(';
    });
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
                if (left === 'r' && !right.includes('x') && !right.includes('y')) {
                    try {
                        const mathExpr=ltmExpr(right);
                        const compiled=math.compile(mathExpr);
                        functions.push({
                            index:idx,
                            isPolar:true,
                            expr:compiled,
                            latex:latex,
                            lStyle:'solid',
                            colour:getColourIdx(idx)
                        });
                        if (colourInd) colourInd.classList.remove('hidden');
                        return;
                    } catch (e) {
                        console.log("error parsing polar eq:",e);
                        if (colourInd) colourInd.classList.add('hidden');
                        return;
                    }
                }
                else if (right === 'r' && !left.includes('x') && !left.includes('y')) {
                    try {
                        const mathExpr = ltmExpr(left);
                        const compiled = math.compile(mathExpr);
                        functions.push({
                            index:idx,
                            isPolar:true,
                            expr:compiled,
                            latex:latex,
                            lStyle:'solid',
                            colour:getColourIdx(idx)
                        });
                        if (colourInd) colourInd.classList.remove('hidden');
                        return;
                    } catch (e) {
                        console.log("error parsing polar eq:",e);
                        if (colourInd) colourInd.classList.add('hidden');
                        return;
                    }
                }
                if (left === 'y') {
                    expr = right;
                    hasVFunc = true;
                }
                else if (right === 'y') {
                    expr = left;
                    hasVFunc = true;
                }
                else if (left ==='x' && !right.includes('y')) {
                    isVertical = true;
                    expr=right;
                    try {
                        const mathExpr = ltmExpr(right);
                        const compiled = math.compile(mathExpr);
                        const result = compiled.evaluate({});
                        if (typeof result === 'number' && isFinite(result)) {
                            verticalX = result;
                            hasVFunc = true;
                        }
                    } catch (e) {
                        console.log("error eval vertical line:",e);
                    }
                }
                else if(right==='x' && !left.includes('y')) {
                    isVertical=true;
                    expr=left;
                    try{
                        const mathExpr = ltmExpr(left);
                        const compiled = math.compile(mathExpr);
                        const result = compiled.evaluate({});
                        if (typeof result === 'number' && isFinite(result)) {
                            verticalX = result;
                            hasVFunc= true;
                        }
                    } catch (e) {
                        console.log("error eval vertical line:",e);
                    }
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
                            lStyle:'solid',
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
                    lStyle:'solid',
                    colour:getColourIdx(idx),
                    verticalExpr:expr
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
                lStyle:'solid',
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
    updParamsPnl();
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

function getLstyle(idx) {
    return 'solid';//default
}

function plotPolar(func) {
    const width=canvas.width;
    const height=canvas.height;
    const centerX=width/2+offsetX;
    const centerY=height/2+offsetY;
    ctx.strokeStyle=func.colour;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let firstPoint = true;
    const thetaStep = 0.01;
    for (let theta=0;theta<=Math.PI*4;theta+=thetaStep) {
        try {
            const r = func.expr.evaluate({theta:theta,θ:theta}); //asked AI for some help here
            if (typeof r !== 'number' || !isFinite(r)) {
                firstPoint=true;
                continue;
            }
            const x=r*Math.cos(theta);//asked AI for some help here too
            const y=r*Math.sin(theta);
            const px = centerX+x*scale;
            const py = centerY-y*scale;
            if (Math.abs(px)<width*3&&Math.abs(py)<height*3) {
                if (firstPoint) {
                    ctx.moveTo(px,py);
                    firstPoint=false;
                } else {
                    ctx.lineTo(px,py);
                }
            } else {
                firstPoint=true;
            }
        } catch (e) {
            firstPoint=true;
        }
    }
    ctx.stroke();
    ctx.fillStyle=func.colour;
    ctx.beginPath();
    ctx.arc(centerX,centerY,4,0,Math.PI*2);
    ctx.fill();
    POIs.push({
        x:0,
        y:0,
        px:centerX,
        py:centerY,
        type:'pole',
        colour:func.colour,
        funcIdx:func.index
    });
}

function plotFuncs() {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width/2 + offsetX;
    const centerY = height/2 + offsetY;
    POIs = [];
    functions.forEach(func => {
        if (func.isPolar) {
            plotPolar(func);
            return;
        }
        ctx.strokeStyle=func.colour;
        const lStyle=func.lStyle || 'solid';
        if (lStyle === 'thick') {
            ctx.lineWidth=5;
        } else {
            ctx.lineWidth=2.5;
        }
        if (lStyle === 'dash') {
            ctx.setLineDash([10,5]);
        } else if (lStyle==='dot') {
            ctx.setLineDash([2,4]);
        } else {
            ctx.setLineDash([]);
        }
        if (func.isVertical) {
            let xValue = func.x;
            if (func.verticalExpr) {
                try {
                    const mathExpr = ltmExpr(func.verticalExpr);
                    const compiled = math.compile(mathExpr);
                    const result = compiled.evaluate({});
                    if (typeof result === 'number' && isFinite(result)) {
                        xValue = result;
                    }
                } catch (e) {
                    // use og x
                }
            }
            const px = centerX + (xValue*scale);
            if (px >= 0 && px <= width) {
                ctx.beginPath();
                ctx.moveTo(px,0);
                ctx.lineTo(px,height);
                ctx.stroke();
                ctx.setLineDash([]);
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
    ctx.setLineDash([]);
    if (hovPoint) {
        drawTooltip(hovPoint);
    }
}

const ogDrawGraph = drawGraph;
drawGraph = function() {
    ogDrawGraph();
    plotFuncs();
    findInters();
    console.log('inters:',inters.length,inters);
    drawInters();
    if (traceMode && tracePoint) {
        drawTrace();
    }
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
        <button class="dupe-btn">
            <span class="material-symbols-outlined">content_copy</span>
        </button>
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
                            lStyle:'solid',
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
                    lStyle:'solid',
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
                lStyle:'solid',
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
    const undoBtn = toolbarBtns[4];
    const redoBtn = toolbarBtns[5];
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
    let xLabel = `x: ${point.x.toFixed(3)}`;
    let yLabel = `y: ${point.y.toFixed(3)}`;
    let typeLabel = point.type.replace('-',' ');
    if (point.type === 'inter') {
        typeLabel = `Intersection (f${point.funcIdx+1} ∩ f${point.func2Idx+1})`;
    }
    if (point.isPolar) {
        xLabel = `r: ${point.r.toFixed(3)}`;
        yLabel = `θ: ${point.theta.toFixed(3)}`;
        typeLabel = `(x: ${point.x.toFixed(2)}, y: ${point.y.toFixed(2)})`;
    } else if (point.type === 'pole') {
        typeLabel = 'Pole (origin)';
        xLabel= `x: ${point.x.toFixed(3)}`;
        yLabel= `y: ${point.y.toFixed(3)}`;
    } else {
        xLabel=`x: ${point.x.toFixed(3)}`;
        yLabel = `y: ${point.y.toFixed(3)}`;
        typeLabel = point.type.replace('-',' ');
    }
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

    if (point.type === 'inter') {
        const gradient=ctx.createRadialGradient(point.px,point.py,0,point.px,point.py,10);
        gradient.addColorStop(0,point.colour);
        if (point.func2Idx !== undefined) {
            const func2 = functions.find(f => f.index === point.func2Idx);
            if (func2) {
                gradient.addColorStop(1,func2.colour);
            }
        }
        ctx.fillStyle=gradient;
    } else {
        ctx.fillStyle=point.colour;
    }
    
    ctx.strokeStyle='#fff';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(point.px,point.py,7,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
}

function drawTrace() {
    if (!tracePoint) return;
    const centerX = canvas.width/2+offsetX;
    const centerY = canvas.height/2+offsetY;
    ctx.strokeStyle=tracePoint.colour;
    ctx.lineWidth=1;

    ctx.setLineDash([3,3]);
    ctx.beginPath();
    ctx.moveTo(tracePoint.px,tracePoint.py);
    ctx.lineTo(tracePoint.px,centerY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tracePoint.px,tracePoint.py);
    ctx.lineTo(centerX,tracePoint.py);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle=tracePoint.colour;
    ctx.strokeStyle='#fff';
    ctx.lineWidth=3;

    ctx.beginPath();
    ctx.arc(tracePoint.px,tracePoint.py,6,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle='#000';
    ctx.font='bold 12px Ubuntu';
    ctx.textAlign='center';

    ctx.fillText(tracePoint.x.toFixed(3),tracePoint.px,centerY+20);
    ctx.save();
    ctx.translate(centerX-30,tracePoint.py);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(tracePoint.y.toFixed(3),0,0);
    ctx.restore();
    drawTraceTT(tracePoint);
}

function drawTraceTT(point) {
    const padding = 10;
    const lnHeight = 20;
    const xLabel = `x = ${point.x.toFixed(4)}`;
    const yLabel = `y = ${point.y.toFixed(4)}`;
    ctx.font = '14px Ubuntu';
    const xWidth = ctx.measureText(xLabel).width;
    const yWidth = ctx.measureText(yLabel).width;
    const maxWidth = Math.max(xWidth,yWidth);
    const tooltipWidth = maxWidth+padding*2;
    const tooltipHeight = lnHeight*2+padding*2;
    let tooltipX = point.px+20;
    let tooltipY = point.py-tooltipHeight-20;
    if (tooltipX+tooltipWidth>canvas.width-10) {
        tooltipX=point.px-tooltipWidth-20;
    }
    if (tooltipY < 10) {
        tooltipY = point.py + 20;
    }
    ctx.fillStyle = 'rgba(30,30,30,0.95)';
    ctx.strokeStyle = point.colour;
    ctx.lineWidth = 2;
    const radius=6;

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
    ctx.textBaseline='top';
    ctx.font='bold 14px Ubuntu';
    ctx.fillText(xLabel,tooltipX+padding,tooltipY+padding);
    ctx.fillText(yLabel,tooltipX+padding,tooltipY+padding+lnHeight);
}

//colpicker functionality
const colpickerBtn = document.getElementById('colpicker');
const colpickerPnl = document.getElementById('colpicker-pnl');
const colpickerFuncs = document.getElementById('colpicker-funcs');
const colpickerPS = document.getElementById('colpreset-section');
const customColInp = document.getElementById('custom-col-in');
let selFuncIdx = null;

colpickerBtn.addEventListener('click',(e)=>{
    e.stopPropagation();
    menuDrp.classList.remove('show');
    colpickerFuncs.innerHTML = '';
    const expItems = document.querySelectorAll('.exp-item');
    expItems.forEach((item,idx)=>{
        if (item===document.getElementById('exp').lastElementChild) return;
        const mathField = item.querySelector('math-field');
        if (!mathField || !mathField.value) return;
        const func = functions.find(f => f.index===idx);
        if (!func) return;
        const funcItem=document.createElement('div');
        funcItem.className='colpicker-item';
        funcItem.innerHTML = `
        <span class="exp-num">${idx+1}</span>
        <div class="colswatch" style="background-color:${func.colour};"></div>
        <div class="func-preview">${mathField.value}</div>`;
        funcItem.addEventListener('click',()=>{
            selFuncIdx=idx;
            colpickerPS.style.display='block';
            document.getElementById('lstyle-sec').style.display='block';
            const currentStyle = func.lStyle || 'solid';
            document.querySelectorAll('.lstyle-btn').forEach(btn=>{
                btn.classList.remove('active');
                if (btn.getAttribute('data-style') === currentStyle) {
                    btn.classList.add('active');
                }
            });
            document.querySelectorAll('.colpicker-item').forEach(i => {
                i.style.background='';
            });
            funcItem.style.background='rgba(45,112,179,0.08)';
        });
        colpickerFuncs.appendChild(funcItem);
    });
    colpickerPnl.classList.toggle('show');
    colpickerPS.style.display='none';
    document.getElementById('lstyle-sec').style.display='none';
    selFuncIdx=null;
});

document.addEventListener('click',(e)=>{
    if (!colpickerPnl.contains(e.target) && e.target != colpickerBtn) {
        colpickerPnl.classList.remove('show');
    }
});

document.querySelectorAll('.colpreset').forEach(preset => {
    preset.addEventListener('click',()=>{
        if (selFuncIdx===null) return;
        const colour = preset.getAttribute('data-color');
        applyColFunc(selFuncIdx,colour);
        colpickerPnl.classList.remove('show');
    });
});

customColInp.addEventListener('change',(e)=>{
    if (selFuncIdx===null) return;
    applyColFunc(selFuncIdx,e.target.value);
    colpickerPnl.classList.remove('show');
});

document.querySelectorAll('.lstyle-btn').forEach(btn => {
    btn.addEventListener('click',()=>{
        if (selFuncIdx === null) return;
        const style=btn.getAttribute('data-style');
        applyLstyle(selFuncIdx,style);
        document.querySelectorAll('.lstyle-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
    });
});

function applyLstyle(funcIdx,style) {
    const func = functions.find(f=>f.index===funcIdx);
    if (func) {
        func.lStyle=style;
    }
    drawGraph();
    if (!isRes) {
        saveState();
    }
}

function applyColFunc(funcIndex,colour) {
    const func = functions.find(f => f.index === funcIndex);
    if (func) {
        func.colour=colour;
    }
    const expItems=document.querySelectorAll('.exp-item');
    const targetItem = expItems[funcIndex];
    if (targetItem) {
        const colourInd = targetItem.querySelector('.colour-ind');
        if (colourInd) {
            colourInd.style.backgroundColor=colour;
        }
    }
    drawGraph();
    if (!isRes) {
        saveState();
    }
}

//params section stuff
const paramsTgl = document.getElementById('params-tgl');
const paramsSec = document.querySelector('.params-sec');
paramsTgl.addEventListener('click',() => {
    paramsSec.classList.toggle('collapsed');
    if (paramsSec.classList.contains('collapsed')) {
        paramsTgl.innerHTML = '<span class="material-symbols-outlined">expand_less</span>';
    } else {
        paramsTgl.innerHTML = '<span class="material-symbols-outlined">expand_more</span>';
    }
});

function findParams(latex) {
    const params = new Set();
    const matches = latex.match(/(?<![a-zA-Z])([a-uw-z]|[A-Z])(?![a-zA-Z])/g);
    if (matches) {
        matches.forEach(match => {
            if (!['x','y','e','i','E','I'].includes(match)) {
                params.add(match);
            }
        });
    }
    return Array.from(params);
}

function updParamsPnl() {
    const paramsCont = document.getElementById('params-content');
    const allParams = new Set();
    functions.forEach(func => {
        const params = findParams(func.latex);
        params.forEach(p => allParams.add(p));
    });
    Object.keys(params).forEach(param => {
        if (!allParams.has(param)) {
            delete params[param];
        }
    });
    allParams.forEach(param => {
        if (!(param in params)) {
            params[param]=1;
        }
    });
    paramsCont.innerHTML = '';
    if (allParams.size===0) {
        paramsCont.innerHTML = '<div class="empty-params">No parameters found, try adding variables into your equations!</div>';
        return;
    }
    paramListeners.forEach(ls =>{
        ls.element.removeEventListener('input',ls.handler);
    });
    allParams.forEach(param => {
        const paramItem = document.createElement('div');
        paramItem.className ='param-item';
        const val =params[param];
        paramItem.innerHTML = `
        <div class="param-hdr">
            <span class="param-name">${param}</span>
            <input type="number" class="param-val" value="${val.toFixed(2)}" step="0.01">
        </div>
        <div class="param-scontainer">
            <span class="param-min">-10</span>
            <input type="range" class="param-slider" min="-10" max="10" step="0.01" value="${val}">
            <span class="param-max">10</span>
        </div>`;
        paramsCont.appendChild(paramItem);
        const slider = paramItem.querySelector('.param-slider');
        const valInput = paramItem.querySelector('.param-val');
        const sliderHandler = (e)=>{
            const newValue = parseFloat(e.target.value);
            params[param]=newValue;
            valInput.value=newValue.toFixed(2);
            drawGraph();
        };
        const valHandler = (e)=>{
            let newValue = parseFloat(e.target.value);
            if (isNaN(newValue)) newValue = 0;
            params[param]=newValue;
            slider.value=Math.max(-10,Math.min(10,newValue));
            drawGraph();
        };
        slider.addEventListener('input',sliderHandler);
        valInput.addEventListener('input',valHandler);
        paramListeners.push(
            {element:slider,handler:sliderHandler},
            {element:valInput,handler:valHandler}
        );
    });
}

const ogLtmExpr = ltmExpr;
ltmExpr = function(expr) {
    let result = ogLtmExpr(expr);
    Object.keys(params).forEach(param=>{
        const regex=new RegExp(`(?<![a-zA-Z])${param}(?![a-zA-Z])`, 'g');
        result=result.replace(regex,`(${params[param]})`);
    });
    return result;
};

document.getElementById('grid-tgl').addEventListener('click',()=>{
    menuDrp.classList.remove('show');
    showGrid = !showGrid;
    const gridTgl = document.getElementById('grid-tgl');
    const icon= gridTgl.querySelector('.material-symbols-outlined');
    const text=gridTgl.querySelector('span:not(.material-symbols-outlined)');
    if (showGrid) {
        icon.textContent='grid_on';
        text.textContent = 'Hide grid';
    } else {
        icon.textContent = 'grid_on';
        text.textContent = 'Show grid';
    }
    drawGraph();
});

function findInters() { // this function is GENUINELY huge
    inters=[];
    for (let i = 0; i<functions.length; i++) {
        for (let j=i+1;j<functions.length;j++) {
            const func1=functions[i];
            const func2=functions[j];
            if (func1.isImpl && func2.isImpl) {
                const srchRange = canvas.width/scale*1.5;
                const step =2;
                for (let px =0; px <canvas.width; px += step) {
                    for (let py=0;py<canvas.height;py+=step) {
                        const centerX = canvas.width/2+offsetX;
                        const centerY = canvas.height/2+offsetY;
                        const x = (px-centerX)/scale;
                        const y = (centerY-py)/scale;
                        try {
                            const diff1 = func1.leftExpr.evaluate({x:x,y:y})-func1.rightExpr.evaluate({x:x,y:y});
                            const diff2 = func2.leftExpr.evaluate({x:x,y:y})-func2.rightExpr.evaluate({x:x,y:y});
                            if (Math.abs(diff1)<0.1 && Math.abs(diff2) < 0.1) {
                                let bestX = x,bestY = y;
                                let bestErr = Math.abs(diff1) + Math.abs(diff2);
                                for (let dx=-step/scale;dx<=step/scale;dx+=step/(scale*10)) {
                                    for (let dy = -step/scale;dy<=step/scale;dy+=step/(scale*10)) {
                                        const testX = x+dx;
                                        const testY = y+dy;
                                        const d1 = func1.leftExpr.evaluate({x:testX,y:testY})-func1.rightExpr.evaluate({x:testX,y:testY});
                                        const d2 = func2.leftEXpr.evaluate({x:testX,y:testY})-func2.rightExpr.evaluate({x:testX,y:testY});
                                        const err = Math.abs(d1) + Math.abs(d2);
                                        if (err < bestErr) {
                                            bestErr = err;
                                            bestX = testX;
                                            bestY = testY;
                                        }
                                    }
                                }
                                const isDupe = inters.some(int => {
                                    Math.abs(int.x-bestX)<0.5&&Math.abs(int.y-bestY)<0.5
                                });
                                if (!isDupe && bestErr < 0.01) {
                                    inters.push({
                                        x:bestX,
                                        y:bestY,
                                        func1Idx:func1.index,
                                        func2Idx:func2.index,
                                        colour1:func1.colour,
                                        colour2:func2.colour
                                    });
                                }
                            }
                        } catch (e) {}
                    }
                }
                continue;
            }
            if (func1.isImpl && !func2.isImpl && !func2.isVertical) {
                const srchRange=canvas.width/scale*1.5;
                const step=0.1;
                for(let x=-srchRange; x<=srchRange;x+=step) {
                    try {
                        const y= func2.expr.evaluate({x:x,y:y})-func1.rightExpr.evaluate({x:x,y:y});
                        if (Math.abs(diff) < 0.1) {
                            const isDupe = inters.some(int =>
                                Math.abs(int.x-x)<0.1&&Math.abs(int.y-y)<0.1
                            );
                            if (!isDupe) {
                                inters.push({
                                    x:x,
                                    y:y,
                                    func1Idx:func1.index,
                                    func2Idx:func2.index,
                                    colour1:func1.colour,
                                    colour2:func2.colour
                                });
                            }
                        }
                    } catch (e) {}
                }
                continue;
            }
            if (func1.isImpl && !func2.isImpl && !func2.isVertical) {
                const srchRange=canvas.width/scale*1.5;
                const step = 0.1;
                for (let x=-srchRange; x<=srchRange;x+=step) {
                    try {
                        const y=func2.expr.evaluate({x:x});
                        if (!isFinite(y)) continue;
                        const diff = func1.leftExpr.evaluate({x:x,y:y}-func1.rightExpr.evaluate({x:x,y:y}));
                        if (Math.abs(diff)<0.1) {
                            const isDupe = inters.some(int =>
                                Math.abs(int.x-x) < 0.1 && Math.abs(int.y-y)<0.1
                            );
                            if (!isDupe) {
                                inters.push({
                                    x:x,
                                    y:y,
                                    func1Idx:func1.index,
                                    func2Idx:func2.index,
                                    colour1:func1.colour,
                                    colour2:func2.colour
                                });
                            }
                        }
                    } catch (e) {}
                }
                continue;
            }
            if (func2.isImpl && !func1.isImpl && !func1.isVertical) {
                const srchRange = canvas.width/scale*1.5;
                const step = 0.1;
                for (let x = -srchRange;x<=srchRange;x+=step) {
                    try {
                        const y = func1.expr.evaluate({x:x});
                        if (!isFinite(y)) continue;
                        const diff = func2.leftExpr.evaluate({x:x,y:y})-func2.rightExpr.evaluate({x:x,y:y});
                        if (Math.abs(diff)<0.1) {
                            const isDupe = inters.some(int =>
                                Math.abs(int.x-x)<0.1 && Math.abs(int.y-y)<0.1
                            );
                            if (!isDupe) {
                                inters.push({
                                    x:x,
                                    y:y,
                                    func1Idx:func1.index,
                                    func2Idx:func2.index,
                                    colour1:func1.colour,
                                    colour2:func2.colour
                                });
                            }
                        }
                    } catch (e) {}
                }
                continue;
            }
            if (func1.isImpl || func2.isImpl) continue;
            if (func1.isVertical && !func2.isVertical) {
                try {
                    const x = func1.x;
                    const y= func2.expr.evaluate({x:x});
                    if (isFinite(y)) {
                        inters.push({
                            x:x,
                            y:y,
                            func1Idx:func1.index,
                            func2Idx:func2.index,
                            colour1:func.colour,
                            colour2:func2.colour
                        });
                    }
                } catch (e) {}
                continue;
            }
            if (func1.isImpl || func2.isImpl) continue;
            if (func1.isVertical && !func2.isVertical) {
                try {
                    const x = func1.x;
                    const y= func2.expr.evaluate({x:x});
                    if (isFinite(y)) {
                        inters.push({
                            x:x,
                            y:y,
                            func1Idx:func1.index,
                            func2Idx:func2.index,
                            colour1:func1.colour,
                            colour2:func2.colour
                        });
                    }
                } catch (e) {}
                continue;
            }
            if (func2.isVertical && !func1.isVertical) {
                try {
                    const x=func2.x;
                    const y=func1.expr.evaluate({x:x});
                    if (isFinite(y)) {
                        inters.push({
                            x:x,
                            y:y,
                            func1Idx:func1.index,
                            func2Idx:func2.index,
                            colour1:func1.colour,
                            colour2:func2.colour
                        });
                    }
                } catch (e) {}
                continue;
            }
            if (func1.isVertical && func2.isVertical) continue;
            const srchRange = canvas.width/scale*1.5;
            const step = 0.1;
            for (let x = -srchRange; x<=srchRange; x+= step) {
                try {
                    const y1=func1.expr.evaluate({x:x});
                    const y2=func2.expr.evaluate({x:x});
                    if (!isFinite(y1) || !isFinite(y2)) continue;
                    const diff = y1-y2;
                    const xNext = x+step;
                    const y1Next = func1.expr.evaluate({x:xNext});
                    const y2Next = func2.expr.evaluate({x:xNext});
                    if (!isFinite(y1Next) || !isFinite(y2Next)) continue;
                    const diffNext = y1Next-y2Next;
                    if (Math.sign(diff) !== Math.sign(diffNext) && diff !== 0) {
                        let x1 = x;
                        let x2 = xNext;
                        for (let iter = 0; iter < 20; iter++) {
                            const xMid = (x1+x2)/2;
                            const y1Mid = func1.expr.evaluate({x:xMid});
                            const y2Mid = func2.expr.evaluate({x:xMid});
                            const diffMid = y1Mid-y2Mid;
                            if (Math.abs(diffMid)<0.0001) {
                                const yInt = (y1Mid+y2Mid)/2;
                                const isDupe = inters.some(int => 
                                    Math.abs(int.x-xMid)<0.01 && Math.abs(int.y-yInt)<0.01 && ((int.func1Idx === func1.index && int.func2Idx === func2.index) || (int.func1Idx === func2.index && int.func2Idx === func1.index))
                                );
                                if (!isDupe) {
                                    inters.push({
                                        x:xMid,
                                        y:yInt,
                                        func1Idx:func1.index,
                                        func2Idx:func2.index,
                                        colour1:func1.colour,
                                        colour2:func2.colour
                                    });
                                }
                                break;
                            }
                            if (Math.sign(diffMid) === Math.sign(diff)) {
                                x1=xMid;
                            } else {
                                x2=xMid;
                            }
                        }
                    }
                } catch (e) {
                    //skip
                }
            }
        }
    }
}

function drawInters() {
    const centerX = canvas.width/2 + offsetX;
    const centerY = canvas.height/2+offsetY;
    inters.forEach(int => {
        const px = centerX+int.x*scale;
        const py = centerY-int.y*scale;
        if (px < -20 || px > canvas.width + 20 || py < -20 || py > canvas.height+20) {
            return;
        }
        const gradient = ctx.createRadialGradient(px,py,0,px,py,8);
        gradient.addColorStop(0,int.colour1);
        gradient.addColorStop(1,int.colour2);
        ctx.fillStyle=gradient;
        ctx.beginPath();
        ctx.arc(px,py,8,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle='#fff';
        ctx.beginPath();
        ctx.arc(px,py,4,0,Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px,py,6,0,Math.PI*2);
        ctx.stroke();
        POIs.push({
            x:int.x,
            y:int.y,
            px:px,
            py:py,
            type:'inter',
            colour:int.colour1,
            funcIdx:int.func1Idx,
            func2Idx:int.func2Idx
        });
    });
}

//table of vals stuff
const tableBtn = document.getElementById('table');
const tablePnl = document.getElementById('table-pnl');
const tableClose = document.getElementById('table-close');
const tableGen = document.getElementById('table-gen');
const tableExport = document.getElementById('table-export');
const tableCopy = document.getElementById('table-cp');
const tableMIX = document.getElementById('table-mix');
const tableMAX = document.getElementById('table-max');
const tableStep = document.getElementById('table-step');
const tableCont = document.getElementById('table-cont');
const valTable = document.getElementById('vals-table');
const tHead = document.getElementById('thead');
const tBody = document.getElementById('tbody');

tableBtn.addEventListener('click',(e)=>{
    e.stopPropagation();
    menuDrp.classList.remove('show');
    colpickerPnl.classList.remove('show');
    tablePnl.classList.toggle('show');
    if (tablePnl.classList.contains('show')) {
        genTable();
    }
});

tableClose.addEventListener('click',()=>{
    tablePnl.classList.remove('show');
});

document.addEventListener('click',(e)=>{
    if (!tablePnl.contains(e.target) && e.target !== tableBtn) {
        tablePnl.classList.remove('show');
    }
});

tableGen.addEventListener('click',()=>{
    genTable();
});

function genTable() {
    const minX=parseFloat(tableMIX.value);
    const maxX=parseFloat(tableMAX.value);
    const step=parseFloat(tableStep.value);
    if (isNaN(minX)||isNaN(maxX)||isNaN(step)||step<=0) {
        tableCont.innerHTML = `<div class="table-empty">Please enter valid range and step values.</div>`;
        return;
    }
    if (minX >=maxX) {
        tableCont.innerHTML = `<div class="table-empty">Min X must be less than Max X.</div>`;
        return;
    }
    if (functions.length === 0) {
        tableCont.innerHTML =`<div class="table-empty">No functions to display, try adding some!</div>`;
        return;
    }
    tableCont.innerHTML = '<table class="vals-table"><thead id="thead"></thead><tbody id="tbody"></tbody></table>';
    const newTHead=document.getElementById('thead');
    const newTBody=document.getElementById('tbody');
    let headerHTML='<tr><th>x</th>';
    functions.forEach(func => {
        if (func.isImpl) {
            headerHTML += `<th style="color:${func.colour}">f${func.index+1} (implicit)</th>`;
        } else if (func.isVertical) {
            headerHTML += `<th style="color:${func.colour}">f${func.index+1} (vertical)</th>`;
        } else if (func.isPolar) {
            headerHTML += `<th style="color:${func.colour}">f${func.index+1} (polar)</th>`;
        } else {
            headerHTML += `<th style="color:${func.colour}">f${func.index+1}(x)</th>`;
        }
    });
    headerHTML += '</tr>';
    newTHead.innerHTML=headerHTML;
    let bodyHTML='';
    const numStep=Math.min(Math.ceil((maxX-minX)/step),1000);
    for (let i=0;i<=numStep;i++) {
        const x=minX+(i*step);
        bodyHTML+=`<tr><td>${x.toFixed(4)}</td>`;
        functions.forEach(func=>{
            let value='-';
            try {
                if (func.isVertical) {
                    value='N/A';
                } else if (func.isImpl) {
                    let y1=-100;
                    let y2=100;
                    let foundY=null;
                    try {
                        const f1=func.leftExpr.evaluate({x:x,y:y1}) - func.rightExpr.evaluate({x:x,y:y1});
                        const f2=func.leftExpr.evaluate({x:x,y:y2})-func.rightExpr.evaluate({x:x,y:y2});
                        if (Math.sign(f1) !==Math.sign(f2)) {
                            for (let iter=0;iter<30;iter++) {
                                const yMid=(y1+y2)/2;
                                const leftVal=func.leftExpr.evaluate({x:x,y:yMid});
                                const rightVal=func.rightExpr.evaluate({x:x,y:yMid});
                                const diff=leftVal-rightVal;
                                if (Math.abs(diff)<0.0001) {
                                    foundY=yMid;
                                    break;
                                }
                                if (Math.sign(diff)===Math.sign(f1)) {
                                    y1=yMid;
                                } else {
                                    y2=yMid;
                                }
                            }
                        }
                    } catch (e) {}
                    if (foundY !== null) {
                        value=foundY.toFixed(4);
                    } else {
                        value='undefined';
                    }
                } else if (func.isPolar) {
                    value='N/A';
                } else {
                    const y= func.expr.evaluate({x:x});
                    if (typeof y==='number' && isFinite(y)) {
                        value=y.toFixed(4);
                    } else {
                        value='undefined';
                    }
                }
            } catch (e) {
                value='error';
            }
            bodyHTML += `<td>${value}</td>`;
        });
        bodyHTML+='</tr>';
    }
    newTBody.innerHTML = bodyHTML;
}   

tableExport.addEventListener('click',()=>{
    const minX=parseFloat(tableMIX.value);
    const maxX=parseFloat(tableMAX.value);
    const step=parseFloat(tableStep.value);
    if (functions.length===0) return;
    let csv='x';
    functions.forEach(func=>{
        csv+=`,f${func.index+1}(x)`
    });
    csv += '\n';
    const numSteps = Math.min(Math.ceil((maxX-minX)/step),1000);
    for (let i=0;i<=numSteps;i++) {
        const x = minX+(i*step);
        csv+=x.toFixed(4);
        functions.forEach(func => {
            let value='';
            try {
                if (func.isVertical || func.isPolar) {
                    value='N/A';
                } else if (func.isImpl) {
                    let y1 = -100;
                    let y2 = 100;
                    let foundY=null;
                    try {
                        const f1=func.leftExpr.evaluate({x:x,y:y1})-func.rightExpr.evaluate({x:x,y:y1});
                        const f2=func.leftExpr.evaluate({x:x,y:y2})-func.rightExpr.evaluate({x:x,y:y2});
                        if (Math.sign(f1) !== Math.sign(f2)) {
                            for (let iter=0; iter<30;iter++) {
                                const yMid=(y1+y2)/2;
                                const leftVal=func.leftExpr.evaluate({x:x,y:yMid});
                                const rightVal=func.rightExpr.evaluate({x:x,y:yMid});
                                const diff=leftVal-rightVal;
                                if (Math.abs(diff)<0.0001) {
                                    foundY=yMid;
                                    break;
                                }
                                if (Math.sign(diff)===Math.sign(f1)) {
                                    y1=yMid;
                                } else {
                                    y2=yMid;
                                }
                            }
                        }
                    } catch (e) {}
                    if (foundY !== null) {
                        value=foundY.toFixed(4);
                    } else {
                        value='undefined';
                    }
                } else {
                    const y = func.expr.evaluate({x:x});
                    if(typeof y==='number' && isFinite(y)) {
                        value=y.toFixed(4);
                    }else{
                        value='undefined';
                    }
                }
            } catch (e) {
                value='error';
            }
            csv+=','+value;
        });
        csv+='\n';
    }
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url;
    a.download=`table-vals-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

tableCopy.addEventListener('click',()=>{
    const minX=parseFloat(tableMIX.value);
    const maxX=parseFloat(tableMAX.value);
    const step=parseFloat(tableStep.value);
    if(functions.length===0)return;
    let text='x\t';
    functions.forEach((func,idx)=>{
        text+=`f${func.index+1}(x)`;
        if (idx<functions.length-1)text+='\t';
    });
    text+='\n';
    const numSteps = Math.min(Math.ceil((maxX-minX)/step),1000);
    for (let i=0;i<=numSteps;i++) {
        const x = minX+(i*step);
        text+=x.toFixed(4);
        functions.forEach(func=>{
            let value='';
            try {
                if (func.isVertical || func.isPolar) {
                    value='N/A';
                } else if (func.isImpl) {
                    let y1=-100;
                    let y2=100;
                    let foundY=null;
                    try {
                        const f1=func.leftExpr.evaluate({x:x,y:y1})-func.rightExpr.evaluate({x:x,y:y1});
                        const f2=func.leftExpr.evaluate({x:x,y:y2})-func.rightExpr.evaluate({x:x,y:y2});
                        if (Math.sign(f1) !== Math.sign(f2)) {
                            for (let iter=0;iter<30;iter++) {
                                const yMid = (y1+y2)/2;
                                const leftVal = func.leftExpr.evaluate({x:x,y:yMid});
                                const rightVal = func.rightExpr.evaluate({x:x,y:yMid});
                                const diff = leftVal-rightVal;
                                if (Math.abs(diff) < 0.0001) {
                                    foundY=yMid;
                                    break;
                                }
                                if (Math.sign(diff) === Math.sign(f1)) {
                                    y1=yMid;
                                } else {
                                    y2=yMid;
                                }
                            }
                        }
                    } catch (e) {}
                    if (foundY !== null) {
                        value=foundY.toFixed(4);
                    } else {
                        value='undefined';
                    }
                }
            } catch (e) {
                value='error';
            }
            text+='\t'+value;
        });
        text+='\n';
    }
    navigator.clipboard.writeText(text).then(()=>{
        const ogText=tableCopy.querySelector('span:not(.material-symbols-outlined)').textContent;
        tableCopy.querySelector('span:not(.material-symbols-outlined)').textContent ='Copied!';
        setTimeout(()=>{
            tableCopy.querySelector('span:not(.material-symbols-outlined)').textContent = ogText;
        },1500);
    }).catch(err=>{
        console.error('failed copy:(',err);
    });
});

//clear all
document.getElementById('clear').addEventListener('click',()=>{
    menuDrp.classList.remove('show');
    if (confirm('Are you SURE you want to clear all functions?')) {
        const expContainer = document.getElementById('exp');
        expContainer.innerHTML ='';
        const newItem = document.createElement('div');
        newItem.className='exp-item active';
        newItem.innerHTML =`
        <div class="exp-left">
            <span class="exp-num">1</span>
            <div class="colour-ind hidden" style="background-color:#2d70b3;"></div>
        </div>
        <div class="exp-content">
            <math-field></math-field>
        </div>
        <button class="dupe-btn">
            <span class="material-symbols-outlined">content_copy</span>
        </button>
        <button class="delete-btn">
            <span class="material-symbols-outlined">close</span>
        </button>`;
        expContainer.appendChild(newItem);
        const fadedExp = document.createElement('div');
        fadedExp.className = 'exp-item';
        fadedExp.innerHTML = `
        <div class="exp-left">
            <span class="exp-num">2</span>
            <div class="colour-ind hidden" style="background-color:#e74c3c;"></div>
        </div>
        <div class="exp-content">
            <math-field></math-field>
        </div>
        <button class="dupe-btn">
            <span class="material-symbols-outlined">content_copy</span>
        </button>
        <button class="delete-btn">
            <span class="material-symbols-outlined">close</span>
        </button>`;
        expContainer.appendChild(fadedExp);
        sflListeners();
        functions = [];
        params = {};
        updParamsPnl();
        drawGraph();
        saveState();
    }
});

try {
    const savedHist = localStorage.getItem('funcHistory');
    if (savedHist) {
        funcHistory=JSON.parse(savedHist);
    }
} catch (e) {
    console.log('couldnt read history');
}

function saveHist(latex,colour) {
    if (!latex || latex.trim() === '') return;
    funcHistory=funcHistory.filter(item => item.latex !== latex);
    funcHistory.unshift({
        latex:latex,
        colour:colour,
        timestamp:Date.now()
    });
    if (funcHistory.length>MAX_HIST) {
        funcHistory=funcHistory.slice(0,MAX_HIST)
    }
    try {
        localStorage.setItem('funcHistory',JSON.stringify(funcHistory));
    } catch (e) {
        console.log('couldnt save history');
    }
}

function formatTime(timestamp) {
    const seconds=Math.floor((Date.now()-timestamp)/1000);
    if (seconds >60)return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
    if (seconds < 86400)return `${Math.floor(seconds/3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds/86400)}d ago`;
    return `${Math.floor(seconds/604800)}w ago`;
}

function renderHist() {
    const histList = document.getElementById('hist-ls');
    if (funcHistory.length === 0) {
        histList.innerHTML='<div class="hist-empty">No recent functions yet.</div>';
        return;
    }
    histList.innerHTML = '';
    funcHistory.forEach((item,idx)=>{
        const histItem = document.createElement('div');
        histItem.className='hist-item';
        histItem.innerHTML=`
        <div class="hist-colour" style="background-color:${item.colour}"></div>
        <div class="hist-latex">${item.latex}</div>
        <div class="hist-time">${formatTime(item.timestamp)}</div>`;
        histList.appendChild(histItem);
    });
}

const histBtn = document.getElementById('history');
const histPnl = document.getElementById('history-pnl');
const histClose = document.getElementById('hist-close');
const histClear = document.getElementById('hist-clear');

histBtn.addEventListener('click',(e)=>{
    e.stopPropagation();
    menuDrp.classList.remove('show');
    colpickerPnl.classList.remove('show');
    tablePnl.classList.remove('show');
    histPnl.classList.toggle('show');
    if (histPnl.classList.contains('show')) {
        renderHist();
    }
});

histClose.addEventListener('click',() => {
    histPnl.classList.remove('show');
});

histClear.addEventListener('click', ()=>{
    if (confirm('Are you SURE you want to clear all function history?')) {
        funcHistory=[];
        try {
            localStorage.removeItem('funcHistory');
        } catch (e) {}
        renderHist();
    }
});

document.addEventListener('click',(e)=>{
    if (!histPnl.contains(e.target) && e.target !== histBtn) {
        histPnl.classList.remove('show');
    }
});

updFunctions();