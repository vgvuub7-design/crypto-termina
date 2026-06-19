// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
if(tg){
    tg.ready();
    tg.expand();
}

// Загрузка начальных значений или дефолты
let balance = parseFloat(localStorage.getItem('terminal_balance')) || 750.0; 
let assets = parseFloat(localStorage.getItem('terminal_assets')) || 25.0; 
let totalSpent = parseFloat(localStorage.getItem('terminal_totalSpent')) || 250.0; 
let totalBoughtCoins = parseFloat(localStorage.getItem('terminal_totalBought')) || 25.0;

let currentPrice = 10.00;
let isMarketRunning = false;
let marketInterval = null;
let labelsCounter = 0;
let priceTrend = 0; 
let trendDuration = 0;

// Сохранение данных в кэш браузера/телефона
function saveData() {
    localStorage.setItem('terminal_balance', balance.toFixed(2));
    localStorage.setItem('terminal_assets', assets.toFixed(2));
    localStorage.setItem('terminal_totalSpent', totalSpent.toFixed(2));
    localStorage.setItem('terminal_totalBought', totalBoughtCoins.toFixed(2));
}

// Сброс данных (если нужно начать заново)
function resetAllData() {
    localStorage.clear();
    balance = 750.0;
    assets = 25.0;
    totalSpent = 250.0;
    totalBoughtCoins = 25.0;
    saveData();
    updateUI();
    logMessage("Все системные сохранения сброшены до начальных настроек.", "txt-yellow");
}

const ctx = document.getElementById('terminalChart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            data: [],
            borderWidth: 2,
            borderColor: '#00f0ff',
            pointRadius: 0,
            tension: 0.3, 
            fill: true,
            backgroundColor: 'rgba(0, 240, 255, 0.02)',
            segment: { borderColor: c => c.p1 && c.p1.parsed.y >= c.p0.parsed.y ? '#00f0ff' : '#ff2a5f' }
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 120 },
        plugins: { legend: { display: false }, annotation: { annotations: { line1: { type: 'line', yMin: currentPrice, yMax: currentPrice, borderColor: 'rgba(0, 240, 255, 0.15)', borderWidth: 1 } } } },
        scales: { x: { display: false }, y: { grid: { color: '#16122c' }, ticks: { color: '#665f8a', font: { family: 'monospace', size: 10 } } } }
    }
});

function getAvgPrice() { return totalBoughtCoins > 0 ? (totalSpent / totalBoughtCoins) : 0; }

function updateUI() {
    let currentEquity = balance + (assets * currentPrice);
    document.getElementById('equity').innerText = currentEquity.toFixed(2);
    document.getElementById('balance').innerText = balance.toFixed(2);
    document.getElementById('assetsTop').innerText = assets.toFixed(2) + " STAR";
    document.getElementById('assetsRight').innerText = assets.toFixed(2) + " STAR";
    document.getElementById('price').innerText = currentPrice.toFixed(2);
    
    let avg = getAvgPrice();
    document.getElementById('avgPrice').innerText = `Средняя цена входа: $${avg.toFixed(2)}`;
    
    let pnl = avg > 0 ? (((currentPrice - avg) / avg) * 100) : 0;
    let pnlEl = document.getElementById('positionPnl');
    pnlEl.innerText = `PnL активов: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`;
    pnlEl.className = pnl >= 0 ? 'txt-blue' : 'txt-red';
}

function setMiniBet(game, action) {
    let input = document.getElementById(`bet_${game}`);
    if(!input) return;
    if(action === 0.5) input.value = 0.5;
    else if(action === 'half') input.value = Math.max(0.1, (balance / 2).toFixed(1));
    else if(action === 'all') input.value = balance.toFixed(1);
}

function checkBet(amount) {
    if (isNaN(amount) || amount <= 0) { logMessage("Ошибка: Неверная ставка", "txt-red"); return false; }
    if (amount > balance) { logMessage("Ошибка: Недостаточно USD", "txt-red"); return false; }
    return true;
}

function toggleMarket() {
    isMarketRunning = !isMarketRunning;
    let btn = document.getElementById('sessionBtn');
    if(isMarketRunning) {
        btn.innerText = "Выключить Живой Рынок STAR";
        btn.classList.add('active');
        document.getElementById('buyBtn').disabled = false;
        document.getElementById('sellBtn').disabled = false;
        logMessage("Рыночный терминал синхронизирован. Котировки поступают.", "txt-blue");
        
        marketInterval = setInterval(() => {
            if(trendDuration <= 0) {
                priceTrend = (Math.random() - 0.49); 
                trendDuration = Math.floor(Math.random() * 5) + 3;
            }
            trendDuration--;
            
            let change = (Math.random() - 0.45) * 0.4 + priceTrend * 0.3;
            currentPrice = Math.max(1.00, currentPrice + change);
            
            if(Math.random() < 0.07) {
                let whaleBuy = Math.random() > 0.5;
                let volume = Math.floor(Math.random() * 5000) + 1000;
                if(whaleBuy) {
                    currentPrice += Math.random() * 1.5;
                    document.getElementById('whaleTape').innerHTML = `<span class="txt-blue">▲ КИТ КУПИЛ: ${volume} STAR. Памп!</span>`;
                } else {
                    currentPrice = Math.max(1.00, currentPrice - Math.random() * 1.5);
                    document.getElementById('whaleTape').innerHTML = `<span class="txt-red">▼ КИТ СЛИЛ: ${volume} STAR. Дамп!</span>`;
                }
            }

            chart.data.labels.push(labelsCounter++);
            chart.data.datasets[0].data.push(currentPrice);
            if(chart.data.labels.length > 30) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            chart.options.plugins.annotation.annotations.line1.yMin = currentPrice;
            chart.options.plugins.annotation.annotations.line1.yMax = currentPrice;
            chart.update();
            updateUI();
        }, 800);
    } else {
        btn.innerText = "Включить Живой Рынок STAR";
        btn.classList.remove('active');
        document.getElementById('buyBtn').disabled = true;
        document.getElementById('sellBtn').disabled = true;
        clearInterval(marketInterval);
        logMessage("Рыночные котировки заморожены.", "txt-muted");
    }
}

function setBuyPercent(pct) { document.getElementById('orderAmount').value = (balance * pct).toFixed(1); }
function setSellPercent(pct) { document.getElementById('sellAmount').value = (assets * pct).toFixed(2); }

function manualBuy() {
    let usd = parseFloat(document.getElementById('orderAmount').value);
    if(!checkBet(usd)) return;
    let bought = usd / currentPrice;
    balance -= usd;
    assets += bought;
    totalSpent += usd;
    totalBoughtCoins += bought;
    logMessage(`Куплено: +${bought.toFixed(2)} STAR за $${usd.toFixed(2)}`, "txt-blue");
    saveData();
    updateUI();
}

function manualSell() {
    let star = parseFloat(document.getElementById('sellAmount').value);
    if(isNaN(star) || star <= 0 || star > assets) { logMessage("Ошибка: Неверный объем STAR", "txt-red"); return; }
    let gain = star * currentPrice;
    let avgPrice = getAvgPrice();
    totalSpent = Math.max(0, totalSpent - (star * avgPrice));
    totalBoughtCoins = Math.max(0, totalBoughtCoins - star);
    assets -= star;
    balance += gain;
    logMessage(`Продано: -${star.toFixed(2)} STAR за $${gain.toFixed(2)}`, "txt-yellow");
    saveData();
    updateUI();
}

function logMessage(text, colorClass="") {
    let log = document.getElementById('log');
    log.innerHTML = `<div class="${colorClass}">[${new Date().toLocaleTimeString()}] ${text}</div>` + log.innerHTML;
}

// 1. CRASH (АВИАТОР)
let crashMux = 1.0;
let crashTimer = null;
let isCrashRunning = false;
function startCrash() {
    let bet = parseFloat(document.getElementById('bet_crash').value);
    if(!checkBet(bet) || isCrashRunning) return;
    balance -= bet; saveData(); updateUI();
    isCrashRunning = true;
    crashMux = 1.0;
    document.getElementById('crashStart').style.display = 'none';
    document.getElementById('crashCash').style.display = 'inline-block';
    let rocket = document.getElementById('rocket');
    let targetCrash = 1.1 + Math.random() * 6.0;
    
    crashTimer = setInterval(() => {
        crashMux += 0.04 + (crashMux * 0.02);
        document.getElementById('crashMux').innerText = crashMux.toFixed(2) + "x";
        rocket.style.left = Math.min(75, (crashMux * 10)) + "%";
        rocket.style.bottom = Math.min(75, (crashMux * 8)) + "%";
        
        if(crashMux >= targetCrash) {
            clearInterval(crashTimer);
            document.getElementById('crashMux').innerText = "Crashed! @ " + crashMux.toFixed(2) + "x";
            document.getElementById('crashMux').className = "txt-red";
            rocket.style.left = "10px"; rocket.style.bottom = "10px";
            endCrashState();
            logMessage(`Crash поглотил ставку $${bet.toFixed(2)}`, "txt-red");
        }
    }, 100);
}
function cashoutCrash() {
    if(!isCrashRunning) return;
    clearInterval(crashTimer);
    let bet = parseFloat(document.getElementById('bet_crash').value);
    let win = bet * crashMux;
    balance += win; saveData(); updateUI();
    document.getElementById('crashMux').innerText = "Победа! " + crashMux.toFixed(2) + "x";
    document.getElementById('crashMux').className = "txt-blue";
    endCrashState();
    logMessage(`Авиатор приземлился. Выигрыш: +$${win.toFixed(2)}`, "txt-blue");
}
function endCrashState() {
    isCrashRunning = false;
    document.getElementById('crashStart').style.display = 'inline-block';
    document.getElementById('crashCash').style.display = 'none';
    setTimeout(() => { document.getElementById('crashMux').className = "txt-yellow"; }, 2000);
}

// 2. КРИПТО-САПЕР
let minesData = [];
let minesActive = false;
function initMines() {
    let bet = parseFloat(document.getElementById('bet_mines').value);
    if(!checkBet(bet)) return;
    balance -= bet; saveData(); updateUI();
    let board = document.getElementById('minesBoard');
    board.innerHTML = '';
    minesData = Array(9).fill(0);
    let mineIndex = Math.floor(Math.random() * 9);
    minesData[mineIndex] = 1;
    minesActive = true;
    
    for(let i=0; i<9; i++) {
        let cell = document.createElement('button');
        cell.className = 'mine-cell';
        cell.innerText = '💎';
        cell.onclick = () => clickMine(cell, i, bet);
        board.appendChild(cell);
    }
}
function clickMine(cell, idx, bet) {
    if(!minesActive) return;
    if(minesData[idx] === 1) {
        cell.innerText = '💥'; cell.style.background = 'var(--red)';
        minesActive = false;
        logMessage(`Сапер взорван! Потеря: -$${bet.toFixed(2)}`, "txt-red");
    } else {
        cell.innerText = '★'; cell.style.background = 'var(--blue)'; cell.disabled = true;
        minesActive = false;
        let win = bet * 1.5; balance += win; saveData(); updateUI();
        logMessage(`Ядро разминировано! Роялти: +$${win.toFixed(2)}`, "txt-blue");
    }
}

// 3. ДВОЙНОЙ ФЛИП
function playCoin(side) {
    let bet = parseFloat(document.getElementById('bet_coin').value);
    if(!checkBet(bet)) return;
    balance -= bet;
    let el = document.getElementById('visualCoin');
    el.style.transform = "rotateY(720deg)";
    setTimeout(() => {
        let res = Math.random() > 0.5 ? 0 : 1;
        el.innerText = res === 0 ? "★" : "☢";
        el.style.transform = "rotateY(0deg)";
        if(side === res) {
            let win = bet * 2; balance += win;
            logMessage(`Флип выиграл! Получено: +$${win.toFixed(2)}`, "txt-blue");
        } else {
            logMessage(`Флип проиграл. Потеря: -$${bet.toFixed(2)}`, "txt-red");
        }
        saveData();
        updateUI();
    }, 400);
}

// 4. НЕОНОВЫЙ ПРОВИДЕЦ
function playGuess(num) {
    let bet = parseFloat(document.getElementById('bet_guess').value);
    if(!checkBet(bet)) return;
    balance -= bet;
    let lucky = [1, 3, 5, 7, 9][Math.floor(Math.random() * 5)];
    let status = document.getElementById('oracleStatus');
    if(num === lucky) {
        let win = bet * 5; balance += win;
        status.innerHTML = `<span class="txt-blue">Угадал! Число ${lucky}</span>`;
        logMessage(`Провидец подчинился! Награда: +$${win.toFixed(2)}`, "txt-blue");
    } else {
        status.innerHTML = `<span class="txt-red">Ошибка. Было: ${lucky}</span>`;
        logMessage(`Провидец ошибся. Потеря: -$${bet.toFixed(2)}`, "txt-red");
    }
    saveData();
    updateUI();
}

// 5. ХРАНИЛИЩА АЛЬЯНСА
function playShell(num) {
    let bet = parseFloat(document.getElementById('bet_shell').value);
    if(!checkBet(bet)) return;
    balance -= bet;
    let core = Math.floor(Math.random() * 3) + 1;
    document.getElementById('sb1').innerText = core === 1 ? '🔮' : '❌';
    document.getElementById('sb2').innerText = core === 2 ? '🔮' : '❌';
    document.getElementById('sb3').innerText = core === 3 ? '🔮' : '❌';
    
    if(num === core) {
        let win = bet * 2.5; balance += win;
        document.getElementById('shellStatus').innerHTML = "<span class='txt-blue'>Ядро Квантума найдено!</span>";
        logMessage(`Хранилище взломано. Извлечено: +$${win.toFixed(2)}`, "txt-blue");
    } else {
        document.getElementById('shellStatus').innerHTML = "<span class='txt-red'>Сейф пуст!</span>";
        logMessage(`Ловушка сработала. Вы потеряли: -$${bet.toFixed(2)}`, "txt-red");
    }
    saveData();
    updateUI();
    setTimeout(() => {
        document.getElementById('sb1').innerText = '📦';
        document.getElementById('sb2').innerText = '📦';
        document.getElementById('sb3').innerText = '📦';
        document.getElementById('shellStatus').innerText = 'Выбери сундук с ядром';
    }, 1800);
}

// 6. КОЛЕСО ЛИКВИДНОСТИ
function playWheel() {
    let bet = parseFloat(document.getElementById('bet_wheel').value);
    if(!checkBet(bet)) return;
    balance -= bet;
    let wheel = document.getElementById('vWheel');
    let deg = Math.floor(Math.random() * 360) + 1080;
    wheel.style.transform = `rotate(${deg}deg)`;
    
    setTimeout(() => {
        let mults = [0, 0.5, 2, 0, 3, 1];
        let idx = Math.floor(Math.random() * mults.length);
        let m = mults[idx];
        let win = bet * m;
        balance += win; saveData(); updateUI();
        if(m > 1) logMessage(`Колесо выдало профит ${m}x! +$${win.toFixed(2)}`, "txt-blue");
        else if(m === 1) logMessage("Колесо вернуло ставку в ноль.", "txt-muted");
        else logMessage(`Колесо забрало ликвидность: -$${bet.toFixed(2)}`, "txt-red");
    }, 1500);
}

// 7. ГОНКИ РЕПЛИКАНТОВ
function startRace(chosenCar) {
    let bet = parseFloat(document.getElementById('bet_race').value);
    if(!checkBet(bet)) return;
    balance -= bet; saveData(); updateUI();
    let c1 = document.getElementById('car1');
    let c2 = document.getElementById('car2');
    let p1 = 0, p2 = 0;
    
    let timer = setInterval(() => {
        p1 += Math.random() * 8;
        p2 += Math.random() * 8;
        c1.style.left = p1 + "px";
        c2.style.left = p2 + "px";
        
        if(p1 >= 140 || p2 >= 140) {
            clearInterval(timer);
            let winner = p1 > p2 ? '1' : '2';
            if(chosenCar === winner) {
                let win = bet * 2; balance += win;
                logMessage(`Репликант выиграл гонку! Профит: +$${win.toFixed(2)}`, "txt-blue");
            } else {
                logMessage(`Репликант проиграл гонку. Потеря: -$${bet.toFixed(2)}`, "txt-red");
            }
            saveData();
            updateUI();
            setTimeout(() => { c1.style.left = "0"; c2.style.left = "0"; }, 1500);
        }
    }, 60);
}

// 8. СИНДИКАТ-БЛЭКДЖЕК
let bjSum = 0;
function playBJ() {
    let bet = parseFloat(document.getElementById('bet_bj').value);
    if(bjSum === 0) { if(!checkBet(bet)) return; balance -= bet; saveData(); updateUI(); }
    
    let card = Math.floor(Math.random() * 10) + 2;
    bjSum += card;
    let deck = document.getElementById('bjDeck');
    let cardEl = document.createElement('div');
    cardEl.className = 'crypto-card';
    cardEl.innerText = card;
    deck.appendChild(cardEl);
    
    let status = document.getElementById('bjStatus');
    status.innerText = `Очки на столе: ${bjSum}`;
    
    if(bjSum > 21) {
        status.innerHTML = `<span class="txt-red">Перебор! Очки: ${bjSum}</span>`;
        logMessage(`Блэкджек сгорел: -$${bet.toFixed(2)}`, "txt-red");
        endBJState();
    } else if(bjSum >= 18 && bjSum <= 21) {
        let win = bet * 2.5; balance += win; saveData(); updateUI();
        status.innerHTML = `<span class="txt-blue">Успешный диапазон! (${bjSum})</span>`;
        logMessage(`Выплата Блэкджек x2.5! +$${win.toFixed(2)}`, "txt-blue");
        endBJState();
    }
}
function endBJState() {
    document.getElementById('bjBtn').disabled = true;
    document.getElementById('bjResetBtn').style.display = 'inline-block';
}
function resetBJ() {
    bjSum = 0;
    document.getElementById('bjDeck').innerHTML = '';
    document.getElementById('bjStatus').innerText = 'Собери 18-21 на столе:';
    document.getElementById('bjBtn').disabled = false;
    document.getElementById('bjResetBtn').style.display = 'none';
}

// 9. ДЕШИФРАТОР ЯДРА
function playSafe(isEven) {
    let bet = parseFloat(document.getElementById('bet_safe').value);
    if(!checkBet(bet)) return;
    balance -= bet;
    let code = Math.floor(Math.random() * 100);
    let resultEven = (code % 2 === 0);
    let light = document.getElementById('safeLight');
    
    if(isEven === resultEven) {
        let win = bet * 2; balance += win;
        light.style.background = "var(--blue)";
        document.getElementById('safeStatus').innerHTML = `<span class="txt-blue">Взломан! Код: ${code}</span>`;
        logMessage(`Дешифратор взломал ядро безопасности. Получено: +$${win.toFixed(2)}`, "txt-blue");
    } else {
        light.style.background = "var(--red)";
        document.getElementById('safeStatus').innerHTML = `<span class="txt-red">Блок! Код: ${code}</span>`;
        logMessage(`Дешифратор заблокирован: -$${bet.toFixed(2)}`, "txt-red");
    }
    saveData();
    updateUI();
}

// 10. СКРЕТЧ-ДРОП СЕКТОРОВ
let scActive = true;
function scratchCard(element, pos) {
    if(!scActive) return;
    let bet = parseFloat(document.getElementById('bet_scratch').value);
    if(!checkBet(bet)) return;
    balance -= bet;
    scActive = false;
    
    let prizes = ['❌', '❌', '💎'];
    prizes.sort(() => Math.random() - 0.5);
    element.innerText = prizes[pos];
    element.style.background = 'var(--bg-card)';
    element.style.borderColor = 'var(--yellow)';
    
    let status = document.getElementById('scratchStatus');
    if(prizes[pos] === '💎') {
        let win = bet * 4; balance += win;
        status.innerHTML = "<span class='txt-blue'>Успешно стёрто!</span>";
        logMessage(`Скретч-карта принесла джекпот X4! Награда: +$${win.toFixed(2)}`, "txt-blue");
    } else {
        status.innerHTML = "<span class='txt-red'>Пустой сектор...</span>";
        logMessage(`Слой стерт впустую. Потеря: -$${bet.toFixed(2)}`, "txt-red");
    }
    saveData();
    updateUI();
    setTimeout(() => {
        let boxes = document.getElementById('scratchBox').children;
        for(let b of boxes) { b.innerText = '?'; b.style.background = '#130f24'; b.style.borderColor = 'var(--border)'; }
        status.innerText = 'Стирай защитный слой';
        scActive = true;
    }, 1800);
}

// Первый запуск UI для синхронизации
updateUI();