// Configuració global
const Config = {
    canvasSize: 240,
    defaultColor: '0xF800', // Red in RGB565 format
    defaultBackground: '0x0000', // Black in RGB565 format
    defaultFontSize: 1,
    availableColors: {
        'Black': '0x0000',
        'White': '0xFFFF',
        'Red': '0xF800',
        'Green': '0x07E0',
        'Blue': '0x001F',
        'Yellow': '0xFFE0',
        'Cyan': '0x07FF',
        'Magenta': '0xF81F'
    },
    availableFontSizes: [1, 2, 4, 6, 7, 8]
};

// Estat de l'aplicació
const AppState = {
    elements: [],
    selectedIndex: -1,
    isDrawing: false,
    currentTool: null,
    startPos: { x: 0, y: 0 },
    currentColor: Config.defaultColor,
    backgroundColor: Config.defaultBackground,
    currentFontSize: Config.defaultFontSize
};

// Cache d'elements DOM
const DOM = {
    canvas: document.getElementById('preview-canvas'),
    ctx: null,
    elementsList: document.getElementById('elements-list'),
    propertiesForm: document.getElementById('properties-form'),
    generatedCode: document.getElementById('generated-code'),
    cursorPos: document.getElementById('cursor-pos'),
    colorSelect: document.getElementById('color-select'),
    bgColorSelect: document.getElementById('bg-color-select'),
    fontSizeSelect: document.getElementById('font-size-select'),
    tools: {
        line: document.getElementById('btn-line'),
        rect: document.getElementById('btn-rect'),
        circle: document.getElementById('btn-circle'),
        triangle: document.getElementById('btn-triangle'),
        text: document.getElementById('btn-text'),
        arc: document.getElementById('btn-arc'),
        delete: document.getElementById('btn-delete')
    }
};

// Inicialització
function init() {
    if (!DOM.canvas || !DOM.colorSelect || !DOM.bgColorSelect || !DOM.fontSizeSelect) {
        console.error('Error: Alguns elements DOM no s\'han trobat.');
        return;
    }

    DOM.canvas.width = Config.canvasSize;
    DOM.canvas.height = Config.canvasSize;
    DOM.ctx = DOM.canvas.getContext('2d');
    
    initSelectors();
    setupEventListeners();
    redrawCanvas();
    setTool('line');
}

function initSelectors() {
    const colorSelect = DOM.colorSelect;
    colorSelect.innerHTML = '';
    
    const bgColorSelect = DOM.bgColorSelect;
    bgColorSelect.innerHTML = '';
    
    Object.entries(Config.availableColors).forEach(([name, value]) => {
        const option1 = createColorOption(name, value);
        colorSelect.appendChild(option1);
        
        const option2 = createColorOption(name, value);
        bgColorSelect.appendChild(option2);
    });
    
    colorSelect.value = Config.defaultColor;
    bgColorSelect.value = Config.defaultBackground;
    
    initFontSizeSelector();
}

function createColorOption(name, value) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = name;
    option.style.backgroundColor = getColorAsHex(value);
    option.style.color = parseInt(value.substring(2), 16) > 0x7FFF ? 'black' : 'white';
    return option;
}

function initFontSizeSelector() {
    const fontSizeSelect = DOM.fontSizeSelect;
    fontSizeSelect.innerHTML = '';
    
    Config.availableFontSizes.forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = `${size} (${size * 8}px)`;
        fontSizeSelect.appendChild(option);
    });
    
    fontSizeSelect.value = AppState.currentFontSize;
}

function setupEventListeners() {
    Object.keys(DOM.tools).forEach(tool => {
        DOM.tools[tool].addEventListener('click', () => setTool(tool));
    });

    DOM.canvas.addEventListener('mousedown', startDrawing);
    DOM.canvas.addEventListener('mousemove', e => {
        draw(e);
        updateCursorPosition(e);
    });
    DOM.canvas.addEventListener('mouseup', endDrawing);
    DOM.canvas.addEventListener('mouseout', endDrawing);

    DOM.colorSelect.addEventListener('change', handleColorChange);
    DOM.fontSizeSelect.addEventListener('change', handleFontSizeChange);
    DOM.bgColorSelect.addEventListener('change', handleBackgroundColorChange);

    document.getElementById('btn-generate-code').addEventListener('click', generateCode);
    document.getElementById('btn-copy-code').addEventListener('click', copyCode);
}

function handleColorChange(e) {
    AppState.currentColor = e.target.value;
    updateSelectedElementProperty('color', AppState.currentColor);
}

function handleFontSizeChange(e) {
    AppState.currentFontSize = parseInt(e.target.value);
    updateSelectedElementProperty('size', AppState.currentFontSize);
}

function handleBackgroundColorChange(e) {
    AppState.backgroundColor = e.target.value;
    redrawCanvas();
}

function getColorAsHex(rgb565) {
    const value = parseInt(rgb565.substring(2), 16);
    const r = (value >> 11) & 0x1F;
    const g = (value >> 5) & 0x3F;
    const b = value & 0x1F;
    
    const r8 = (r * 527 + 23) >> 6;
    const g8 = (g * 259 + 33) >> 6;
    const b8 = (b * 527 + 23) >> 6;
    
    return `#${((r8 << 16) | (g8 << 8) | b8).toString(16).padStart(6, '0')}`;
}

function setTool(tool) {
    Object.values(DOM.tools).forEach(btn => btn.classList.remove('active'));
    if (tool) DOM.tools[tool].classList.add('active');
    AppState.currentTool = tool;
}

function startDrawing(e) {
    if (!AppState.currentTool) return;

    const pos = getCanvasPosition(e);
    AppState.startPos = {
        x: Math.round(pos.x),
        y: Math.round(pos.y)
    };

    switch (AppState.currentTool) {
        case 'text':
            createTextElement(AppState.startPos);
            return;
        case 'delete':
            deleteElementAtPosition(AppState.startPos);
            return;
    }

    AppState.isDrawing = true;
}

function draw(e) {
    if (!AppState.isDrawing || !AppState.currentTool) return;

    const currentPos = getCanvasPosition(e);
    const roundedPos = {
        x: Math.round(currentPos.x),
        y: Math.round(currentPos.y)
    };
    
    redrawCanvas();

    const { ctx } = DOM;
    ctx.strokeStyle = getColorAsHex(AppState.currentColor);
    ctx.fillStyle = getColorAsHex(AppState.currentColor);
    ctx.lineWidth = 1;

    const drawFunctions = {
        line: () => {
            ctx.beginPath();
            ctx.moveTo(AppState.startPos.x, AppState.startPos.y);
            ctx.lineTo(roundedPos.x, roundedPos.y);
            ctx.stroke();
        },
        rect: () => {
            const x = Math.min(AppState.startPos.x, roundedPos.x);
            const y = Math.min(AppState.startPos.y, roundedPos.y);
            const width = Math.abs(roundedPos.x - AppState.startPos.x);
            const height = Math.abs(roundedPos.y - AppState.startPos.y);
            
            ctx.beginPath();
            ctx.rect(x, y, width, height);
            ctx.stroke();
        },
        circle: () => {
            const radius = Math.round(calculateDistance(AppState.startPos, roundedPos));
            ctx.beginPath();
            ctx.arc(AppState.startPos.x, AppState.startPos.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        },
        triangle: () => {
            ctx.beginPath();
            ctx.moveTo(AppState.startPos.x, AppState.startPos.y);
            ctx.lineTo(roundedPos.x, roundedPos.y);
            ctx.lineTo(AppState.startPos.x, roundedPos.y);
            ctx.closePath();
            ctx.stroke();
        },
        arc: () => {
            const radius = Math.round(calculateDistance(AppState.startPos, roundedPos));
            const startAngle = Math.atan2(AppState.startPos.y - AppState.startPos.y, AppState.startPos.x - AppState.startPos.x);
            const endAngle = Math.atan2(roundedPos.y - AppState.startPos.y, roundedPos.x - AppState.startPos.x);
            
            ctx.beginPath();
            ctx.arc(AppState.startPos.x, AppState.startPos.y, radius, startAngle, endAngle);
            ctx.stroke();
        }
    };

    if (drawFunctions[AppState.currentTool]) {
        drawFunctions[AppState.currentTool]();
    }
}

function endDrawing(e) {
    if (!AppState.isDrawing || !AppState.currentTool) return;

    const endPos = getCanvasPosition(e);
    const roundedEndPos = {
        x: Math.round(endPos.x),
        y: Math.round(endPos.y)
    };
    
    const element = createElement(AppState.currentTool, AppState.startPos, roundedEndPos);

    if (element) {
        AppState.elements.push(element);
        updateElementsList();
        selectElement(AppState.elements.length - 1);
    }

    AppState.isDrawing = false;
    redrawCanvas();
}

function createElement(type, startPos, endPos) {
    const commonProps = {
        color: AppState.currentColor,
        filled: false
    };

    switch (type) {
        case 'line':
            return {
                type: 'line',
                x1: startPos.x,
                y1: startPos.y,
                x2: endPos.x,
                y2: endPos.y,
                ...commonProps
            };
        case 'rect':
            return {
                type: 'rect',
                x: Math.min(startPos.x, endPos.x),
                y: Math.min(startPos.y, endPos.y),
                width: Math.abs(endPos.x - startPos.x),
                height: Math.abs(endPos.y - startPos.y),
                ...commonProps
            };
        case 'circle':
            return {
                type: 'circle',
                x: startPos.x,
                y: startPos.y,
                radius: Math.round(calculateDistance(startPos, endPos)),
                ...commonProps
            };
        case 'triangle':
            return {
                type: 'triangle',
                x1: startPos.x,
                y1: startPos.y,
                x2: endPos.x,
                y2: endPos.y,
                x3: startPos.x,
                y3: endPos.y,
                ...commonProps
            };
            case 'arc':
                const radius = Math.round(calculateDistance(startPos, endPos));
                // Calculem angles correctament
                const startAngle = Math.atan2(startPos.y - endPos.y, startPos.x - endPos.x);
                const endAngle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
                
                return {
                    type: 'arc',
                    x: startPos.x,
                    y: startPos.y,
                    radius: radius,
                    startAngle: startAngle,
                    endAngle: endAngle,
                    ...commonProps
                };
        default:
            return null;
    }
}

function createTextElement(pos) {
    const text = prompt('Introdueix el text:', 'Text');
    if (text) {
        const element = {
            type: 'text',
            x: pos.x,
            y: pos.y,
            text: text,
            color: AppState.currentColor,
            size: AppState.currentFontSize
        };
        AppState.elements.push(element);
        updateElementsList();
        selectElement(AppState.elements.length - 1);
        redrawCanvas();
    }
}

function redrawCanvas() {
    const { ctx } = DOM;
    
    ctx.clearRect(0, 0, Config.canvasSize, Config.canvasSize);
    
    ctx.fillStyle = getColorAsHex(AppState.backgroundColor);
    ctx.fillRect(0, 0, Config.canvasSize, Config.canvasSize);
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(
        Config.canvasSize / 2, 
        Config.canvasSize / 2, 
        Config.canvasSize / 2, 
        0, 
        Math.PI * 2
    );
    ctx.clip();
    
    AppState.elements.forEach(element => drawElement(element));
    ctx.restore();
}

function drawElement(element) {
    const { ctx } = DOM;
    ctx.strokeStyle = getColorAsHex(element.color);
    ctx.fillStyle = getColorAsHex(element.color);
    ctx.lineWidth = 1;

    switch (element.type) {
        case 'line':
            ctx.beginPath();
            ctx.moveTo(element.x1, element.y1);
            ctx.lineTo(element.x2, element.y2);
            ctx.stroke();
            break;
        case 'rect':
            if (element.filled) {
                ctx.fillRect(element.x, element.y, element.width, element.height);
            } else {
                ctx.strokeRect(element.x, element.y, element.width, element.height);
            }
            break;
        case 'circle':
            ctx.beginPath();
            ctx.arc(element.x, element.y, element.radius, 0, Math.PI * 2);
            element.filled ? ctx.fill() : ctx.stroke();
            break;
        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(element.x1, element.y1);
            ctx.lineTo(element.x2, element.y2);
            ctx.lineTo(element.x3, element.y3);
            ctx.closePath();
            element.filled ? ctx.fill() : ctx.stroke();
            break;
        case 'text':
            const fontSize = element.size * 8;
            ctx.font = `${fontSize}px Arial`;
            ctx.textBaseline = 'top';
            ctx.fillText(element.text, element.x, element.y);
            break;
        case 'arc':
                ctx.beginPath();
                // Convertim radians a graus (180/Math.PI)
                const startDeg = element.startAngle * (180/Math.PI);
                const endDeg = element.endAngle * (180/Math.PI);
                ctx.arc(
                    element.x, 
                    element.y, 
                    element.radius, 
                    startDeg, 
                    endDeg
                );
                ctx.stroke();
                break;
    }
}

function updateElementsList() {
    DOM.elementsList.innerHTML = '';
    
    AppState.elements.forEach((element, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${getElementName(element)} ${index + 1}</span>
            <div class="element-controls">
                <button title="Pujar" onclick="event.stopPropagation(); reorderElement(${index}, 'up')">
                    <i class="fas fa-arrow-up"></i>
                </button>
                <button title="Baixar" onclick="event.stopPropagation(); reorderElement(${index}, 'down')">
                    <i class="fas fa-arrow-down"></i>
                </button>
            </div>
        `;
        
        if (index === AppState.selectedIndex) {
            li.classList.add('selected');
        }
        
        li.addEventListener('click', () => selectElement(index));
        DOM.elementsList.appendChild(li);
    });
}

function getElementName(element) {
    const names = {
        line: 'Línia',
        rect: 'Rectangle',
        circle: 'Cercle',
        triangle: 'Triangle',
        text: 'Text',
        arc: 'Arc'
    };
    return names[element.type] || element.type;
}

function reorderElement(index, action) {
    const element = AppState.elements[index];
    
    if (action === 'up' && index < AppState.elements.length - 1) {
        [AppState.elements[index], AppState.elements[index + 1]] = 
        [AppState.elements[index + 1], AppState.elements[index]];
        AppState.selectedIndex = index + 1;
    } else if (action === 'down' && index > 0) {
        [AppState.elements[index], AppState.elements[index - 1]] = 
        [AppState.elements[index - 1], AppState.elements[index]];
        AppState.selectedIndex = index - 1;
    }
    
    redrawCanvas();
    updateElementsList();
}

function selectElement(index) {
    AppState.selectedIndex = index;
    updateElementsList();
    showPropertiesForm(AppState.elements[index]);
}

function deleteElementAtPosition(pos) {
    const index = findElementAtPosition(pos);
    if (index >= 0) {
        AppState.elements.splice(index, 1);
        AppState.selectedIndex = -1;
        updateElementsList();
        redrawCanvas();
        showPropertiesForm(null);
    }
}

function findElementAtPosition(pos) {
    const center = { x: Config.canvasSize / 2, y: Config.canvasSize / 2 };
    const radius = Config.canvasSize / 2;
    if (calculateDistance(pos, center) > radius) return -1;

    for (let i = AppState.elements.length - 1; i >= 0; i--) {
        const element = AppState.elements[i];
        
        if (element.type === 'line' && isPointNearLine(
            pos, 
            { x: element.x1, y: element.y1 }, 
            { x: element.x2, y: element.y2 }, 
            3 // Marge de selecció fix
        )) return i;
        
        if (element.type === 'rect' && 
            pos.x >= element.x && pos.x <= element.x + element.width &&
            pos.y >= element.y && pos.y <= element.y + element.height) return i;
        
        if (element.type === 'circle') {
            const distance = calculateDistance(pos, { x: element.x, y: element.y });
            if (distance <= element.radius + 3 && // Marge de selecció fix
                distance >= element.radius - 3) return i;
        }
        
        if (element.type === 'triangle' && 
            isPointInTriangle(
                pos,
                { x: element.x1, y: element.y1 },
                { x: element.x2, y: element.y2 },
                { x: element.x3, y: element.y3 }
            )) return i;
        
        if (element.type === 'text') {
            DOM.ctx.font = `${element.size * 8}px Arial`;
            const textWidth = DOM.ctx.measureText(element.text).width;
            if (pos.x >= element.x && pos.x <= element.x + textWidth &&
                pos.y >= element.y && pos.y <= element.y + (element.size * 8)) return i;
        }
        
        if (element.type === 'arc') {
            const distance = calculateDistance(pos, { x: element.x, y: element.y });
            const angle = Math.atan2(pos.y - element.y, pos.x - element.x);
            if (distance <= element.radius + 3 && // Marge de selecció fix
                distance >= element.radius - 3 &&
                angle >= element.startAngle && angle <= element.endAngle) return i;
        }
    }
    
    return -1;
}

function getCanvasPosition(e) {
    const rect = DOM.canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function calculateDistance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function isPointNearLine(point, lineStart, lineEnd, tolerance) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    const distance = Math.abs(
        dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
    ) / length;
    
    const dotProduct = (
        (point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy
    ) / (length * length);
    
    return distance <= tolerance && dotProduct >= 0 && dotProduct <= 1;
}

function isPointInTriangle(p, p1, p2, p3) {
    const v0 = [p3.x - p1.x, p3.y - p1.y];
    const v1 = [p2.x - p1.x, p2.y - p1.y];
    const v2 = [p.x - p1.x, p.y - p1.y];

    const dot00 = v0[0] * v0[0] + v0[1] * v0[1];
    const dot01 = v0[0] * v1[0] + v0[1] * v1[1];
    const dot02 = v0[0] * v2[0] + v0[1] * v2[1];
    const dot11 = v1[0] * v1[0] + v1[1] * v1[1];
    const dot12 = v1[0] * v2[0] + v1[1] * v2[1];

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return (u >= 0) && (v >= 0) && (u + v < 1);
}

function updateCursorPosition(e) {
    const pos = getCanvasPosition(e);
    DOM.cursorPos.textContent = `X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}`;
}

function showPropertiesForm(element) {
    DOM.propertiesForm.innerHTML = '';
    
    if (!element) {
        DOM.propertiesForm.innerHTML = '<p>Selecciona un element per editar-ne les propietats</p>';
        return;
    }
    
    const form = document.createElement('div');
    form.className = 'properties-form-content';
    
    const colorSelect = document.createElement('select');
    colorSelect.id = 'prop-color';
    for (const [name, value] of Object.entries(Config.availableColors)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        option.style.backgroundColor = getColorAsHex(value);
        option.style.color = parseInt(value.substring(2), 16) > 0x7FFF ? 'black' : 'white';
        if (value === element.color) option.selected = true;
        colorSelect.appendChild(option);
    }
    
    form.innerHTML += `
        <div class="property-group">
            <label for="prop-color">Color:</label>
            ${colorSelect.outerHTML}
        </div>
    `;
    
    if (element.type === 'line') {
        form.innerHTML += `
            <div class="form-row">
                <label>X1:</label>
                <input type="number" id="prop-x1" value="${element.x1}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Y1:</label>
                <input type="number" id="prop-y1" value="${element.y1}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>X2:</label>
                <input type="number" id="prop-x2" value="${element.x2}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Y2:</label>
                <input type="number" id="prop-y2" value="${element.y2}" min="0" max="240">
            </div>
        `;
    } else if (element.type === 'rect') {
        form.innerHTML += `
            <div class="form-row">
                <label>X:</label>
                <input type="number" id="prop-x" value="${element.x}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Y:</label>
                <input type="number" id="prop-y" value="${element.y}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Amplada:</label>
                <input type="number" id="prop-width" value="${element.width}" min="1" max="240">
            </div>
            <div class="form-row">
                <label>Alçada:</label>
                <input type="number" id="prop-height" value="${element.height}" min="1" max="240">
            </div>
            <div class="form-row">
                <label>Omplert:</label>
                <input type="checkbox" id="prop-filled" ${element.filled ? 'checked' : ''}>
            </div>
        `;
    } else if (element.type === 'circle') {
        form.innerHTML += `
            <div class="form-row">
                <label>X:</label>
                <input type="number" id="prop-x" value="${element.x}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Y:</label>
                <input type="number" id="prop-y" value="${element.y}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Radi:</label>
                <input type="number" id="prop-radius" value="${element.radius}" min="1" max="120">
            </div>
            <div class="form-row">
                <label>Omplert:</label>
                <input type="checkbox" id="prop-filled" ${element.filled ? 'checked' : ''}>
            </div>
        `;
    } else if (element.type === 'triangle') {
        form.innerHTML += `
            <div class="form-row">
                <label>X1:</label>
                <input type="number" id="prop-x1" value="${element.x1}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Y1:</label>
                <input type="number" id="prop-y1" value="${element.y1}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>X2:</label>
                <input type="number" id="prop-x2" value="${element.x2}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Y2:</label>
                <input type="number" id="prop-y2" value="${element.y2}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>X3:</label>
                <input type="number" id="prop-x3" value="${element.x3}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Y3:</label>
                <input type="number" id="prop-y3" value="${element.y3}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Omplert:</label>
                <input type="checkbox" id="prop-filled" ${element.filled ? 'checked' : ''}>
            </div>
        `;
    } else if (element.type === 'text') {
        form.innerHTML += `
            <div class="form-row">
                <label>X:</label>
                <input type="number" id="prop-x" value="${element.x}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Y:</label>
                <input type="number" id="prop-y" value="${element.y}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Text:</label>
                <input type="text" id="prop-text" value="${element.text}">
            </div>
            <div class="form-row">
                <label>Mida:</label>
                <input type="number" id="prop-size" value="${element.size}" min="1" max="8">
            </div>
        `;
    } else if (element.type === 'arc') {
        form.innerHTML += `
            <div class="form-row">
                <label>X:</label>
                <input type="number" id="prop-x" value="${element.x}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Y:</label>
                <input type="number" id="prop-y" value="${element.y}" min="0" max="240">
            </div>
            <div class="form-row">
                <label>Radi:</label>
                <input type="number" id="prop-radius" value="${element.radius}" min="1" max="120">
            </div>
            <div class="form-row">
                <label>Angle Inici (rad):</label>
                <input type="number" id="prop-start-angle" value="${element.startAngle.toFixed(6)}" step="0.01">
            </div>
            <div class="form-row">
                <label>Angle Fi (rad):</label>
                <input type="number" id="prop-end-angle" value="${element.endAngle.toFixed(6)}" step="0.01">
            </div>
        `;
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar element';
    deleteBtn.addEventListener('click', () => {
        if (confirm('Segur que vols eliminar aquest element?')) {
            AppState.elements.splice(AppState.selectedIndex, 1);
            AppState.selectedIndex = -1;
            updateElementsList();
            redrawCanvas();
            showPropertiesForm(null);
        }
    });
    
    form.appendChild(deleteBtn);
    DOM.propertiesForm.appendChild(form);
    
    form.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', updateElementProperties);
    });
}

function updateElementProperties() {
    if (AppState.selectedIndex < 0) return;
    
    const element = AppState.elements[AppState.selectedIndex];
    const form = DOM.propertiesForm.querySelector('.properties-form-content');
    
    element.color = form.querySelector('#prop-color').value;
    
    if (element.type === 'line') {
        element.x1 = parseInt(form.querySelector('#prop-x1').value);
        element.y1 = parseInt(form.querySelector('#prop-y1').value);
        element.x2 = parseInt(form.querySelector('#prop-x2').value);
        element.y2 = parseInt(form.querySelector('#prop-y2').value);
    } else if (element.type === 'rect') {
        element.x = parseInt(form.querySelector('#prop-x').value);
        element.y = parseInt(form.querySelector('#prop-y').value);
        element.width = parseInt(form.querySelector('#prop-width').value);
        element.height = parseInt(form.querySelector('#prop-height').value);
        element.filled = form.querySelector('#prop-filled').checked;
    } else if (element.type === 'circle') {
        element.x = parseInt(form.querySelector('#prop-x').value);
        element.y = parseInt(form.querySelector('#prop-y').value);
        element.radius = parseInt(form.querySelector('#prop-radius').value);
        element.filled = form.querySelector('#prop-filled').checked;
    } else if (element.type === 'triangle') {
        element.x1 = parseInt(form.querySelector('#prop-x1').value);
        element.y1 = parseInt(form.querySelector('#prop-y1').value);
        element.x2 = parseInt(form.querySelector('#prop-x2').value);
        element.y2 = parseInt(form.querySelector('#prop-y2').value);
        element.x3 = parseInt(form.querySelector('#prop-x3').value);
        element.y3 = parseInt(form.querySelector('#prop-y3').value);
        element.filled = form.querySelector('#prop-filled').checked;
    } else if (element.type === 'text') {
        element.x = parseInt(form.querySelector('#prop-x').value);
        element.y = parseInt(form.querySelector('#prop-y').value);
        element.text = form.querySelector('#prop-text').value;
        element.size = parseInt(form.querySelector('#prop-size').value);
    } else if (element.type === 'arc') {
        element.x = parseInt(form.querySelector('#prop-x').value);
        element.y = parseInt(form.querySelector('#prop-y').value);
        element.radius = parseInt(form.querySelector('#prop-radius').value);
        element.startAngle = parseFloat(form.querySelector('#prop-start-angle').value);
        element.endAngle = parseFloat(form.querySelector('#prop-end-angle').value);
    }
    else if (element.type === 'arc') {
        element.startAngle = parseFloat(form.querySelector('#prop-start-angle').value);
        element.endAngle = parseFloat(form.querySelector('#prop-end-angle').value);
        
        // Normalitza angles
        if (element.startAngle > element.endAngle) {
            const temp = element.startAngle;
            element.startAngle = element.endAngle;
            element.endAngle = temp;
        }
    }
    
    redrawCanvas();
}

function updateSelectedElementProperty(prop, value) {
    if (AppState.selectedIndex >= 0) {
        AppState.elements[AppState.selectedIndex][prop] = value;
        redrawCanvas();
    }
}
function generateCode() {
    let code = `#include <TFT_eSPI.h>\n`;
    code += `TFT_eSPI tft = TFT_eSPI();\n\n`;
    
    // Improved function for arcs
    if (AppState.elements.some(e => e.type === 'arc')) {
    code += `void drawArc(int x, int y, int radius, float startAngle, float endAngle, uint16_t color) {\n`;
    code += `  if (startAngle > endAngle) {\n`;
    code += `    float temp = startAngle;\n`;
    code += `    startAngle = endAngle;\n`;
    code += `    endAngle = temp;\n`;
    code += `  }\n`;
    code += `  float step = 0.05; // Arc precision\n`;
    code += `  for (float angle = startAngle; angle <= endAngle; angle += step) {\n`;
    code += `    int px = x + radius * cos(angle);\n`;
    code += `    int py = y + radius * sin(angle);\n`;
    code += `    tft.drawPixel(px, py, color);\n`;
    code += `  }\n`;
    code += `  // Draw the last point to ensure the arc ends exactly where it should\n`;
    code += `  int px = x + radius * cos(endAngle);\n`;
    code += `  int py = y + radius * sin(endAngle);\n`;
    code += `  tft.drawPixel(px, py, color);\n`;
    code += `}\n\n`;
    }
    code += `void setup() {\n`;
    code += `  tft.init();\n`;
    code += `  tft.setRotation(1); // Adjust according to your screen\n`;
    code += `  tft.fillScreen(${AppState.backgroundColor});\n`;
    code += `  \n`;
    code += `  // Draw elements\n`;
    
    AppState.elements.forEach(element => {
        switch (element.type) {
            case 'line':
                code += `  tft.drawLine(${element.x1}, ${element.y1}, ${element.x2}, ${element.y2}, ${element.color});\n`;
                break;
            case 'rect':
                if (element.filled) {
                    code += `  tft.fillRect(${element.x}, ${element.y}, ${element.width}, ${element.height}, ${element.color});\n`;
                } else {
                    code += `  tft.drawRect(${element.x}, ${element.y}, ${element.width}, ${element.height}, ${element.color});\n`;
                }
                break;
            case 'circle':
                if (element.filled) {
                    code += `  tft.fillCircle(${element.x}, ${element.y}, ${element.radius}, ${element.color});\n`;
                } else {
                    code += `  tft.drawCircle(${element.x}, ${element.y}, ${element.radius}, ${element.color});\n`;
                }
                break;
            case 'triangle':
                if (element.filled) {
                    code += `  tft.fillTriangle(${element.x1}, ${element.y1}, ${element.x2}, ${element.y2}, ${element.x3}, ${element.y3}, ${element.color});\n`;
                } else {
                    code += `  tft.drawTriangle(${element.x1}, ${element.y1}, ${element.x2}, ${element.y2}, ${element.x3}, ${element.y3}, ${element.color});\n`;
                }
                break;
            case 'text':
                code += `  tft.setTextColor(${element.color}, ${AppState.backgroundColor});\n`;
                code += `  tft.setTextSize(${element.size});\n`;
                code += `  tft.setCursor(${element.x}, ${element.y});\n`;
                code += `  tft.print("${element.text.replace(/"/g, '\\"')}");\n`;
                break;
            case 'arc':
                code += `  drawArc(${element.x}, ${element.y}, ${element.radius}, ${element.startAngle}, ${element.endAngle}, ${element.color});\n`;;
                break;
        }
    });
    
    code += `}\n\n`;
    code += `void loop() {\n`;
    code += `  // Your code can be added here\n`;
    code += `  // delay(100); // Example: small delay to reduce CPU usage\n`;
    code += `}\n`;
    
    DOM.generatedCode.textContent = code;
}


function copyCode() {
    navigator.clipboard.writeText(DOM.generatedCode.textContent)
        .then(() => alert('Codi copiat al portapapers'))
        .catch(err => console.error('Error en copiar: ', err));
}

// Iniciar l'aplicació
document.addEventListener('DOMContentLoaded', init);

function loadFooter() {
    fetch('footer.html')
      .then(response => response.text())
      .then(data => {
        document.body.insertAdjacentHTML('beforeend', data);
        // Set dynamic link based on current page
        const link = document.getElementById('dynamic-link');
        const linkText = document.getElementById('link-text');
        if (window.location.pathname.includes('help.html')) {
          link.href = 'index.html';
          linkText.textContent = 'Back to Editor';
          link.querySelector('i').className = 'fas fa-arrow-left';
        } else {
          link.href = 'help.html';
          linkText.textContent = 'Help';
          link.querySelector('i').className = 'fas fa-question-circle';
        }
      });
  }
  
  document.addEventListener('DOMContentLoaded', loadFooter);