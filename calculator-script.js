const { jsPDF } = window.jspdf;
const specialCurrencies = ['AMD', 'KGS', 'AED', 'GBP', 'HKD'];

function exportToPDF() {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    
    let y = 20;
    doc.setFontSize(18);
    doc.text('Route Cost Calculator Report', 105, y, {align: 'center'});
    y += 15;
    
    doc.setFontSize(12);
    doc.text('Generated: ' + new Date().toLocaleDateString(), 105, y, {align: 'center'});
    y += 20;
    
    const companyCountry = document.getElementById('companyCountry');
    const data = [
        ['Country', companyCountry.options[companyCountry.selectedIndex]?.text || 'Not selected'],
        ['Performers', document.getElementById('performersCount').value || 'Not set'],
        ['Avg Task Value', '$' + (document.getElementById('avgTaskValue').value || '0')],
        ['Task Commission', (document.getElementById('taskCommission').value || '0') + '%'],
        ['Exchange Fee', (document.getElementById('exchangeFee').value || '0') + '%'],
        ['Withdrawal Fee', (document.getElementById('withdrawalFee').value || '0') + '%']
    ];
    
    doc.setFontSize(14);
    doc.text('Project Parameters:', 20, y);
    y += 10;
    
    doc.setFontSize(10);
    data.forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 20, y);
        y += 6;
    });
    
    y += 10;
    
    if (document.getElementById('results').style.display !== 'none') {
        doc.setFontSize(14);
        doc.text('Calculation Results:', 20, y);
        y += 10;
        
        doc.setFontSize(10);
        const results = [
            document.getElementById('commissionRevenue').textContent,
            document.getElementById('commissionExchange').textContent,
            document.getElementById('commissionWithdrawal').textContent,
            document.getElementById('commissionTotal').textContent,
            '',
            document.getElementById('totalRouteCost').textContent,
            document.getElementById('clientRouteCost').textContent,
            document.getElementById('performerRouteCost').textContent
        ];
        
        results.forEach(result => {
            if (result) {
                doc.text(result.replace(/[^\w\s$%.:-]/g, ''), 20, y);
            }
            y += 6;
        });
    }
    
    doc.save(`route_cost_calculation_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Event handlers
document.getElementById('companyCountry').addEventListener('change', function() {
    ['USA', 'Georgia', 'UAE', 'Armenia', 'Germany', 'Other'].forEach(country => {
        const warning = document.getElementById('countryWarning' + country);
        if (warning) warning.style.display = 'none';
    });
    if (this.value) {
        const warning = document.getElementById('countryWarning' + this.value);
        if (warning) warning.style.display = 'block';
    }
});

document.getElementById('hasRestrictedPerformers').addEventListener('change', function() {
    document.getElementById('restrictedPerformersWarning').style.display = this.checked ? 'block' : 'none';
});

document.getElementById('hasLegalEntityPerformers').addEventListener('change', function() {
    document.getElementById('legalEntityWarning').style.display = this.checked ? 'block' : 'none';
});

document.getElementById('cardTopup').addEventListener('change', function() {
    document.getElementById('cardTopupWarning').style.display = this.checked ? 'block' : 'none';
});

document.getElementById('depositCurrency').addEventListener('change', function() {
    const warning = document.getElementById('specialCurrencyWarning');
    warning.style.display = specialCurrencies.includes(this.value) ? 'block' : 'none';
    updateExchangeOptions();
    if (document.getElementById('results').style.display !== 'none') calculateRevenue();
});

document.getElementById('taskCurrency').addEventListener('change', function() {
    updateExchangeOptions();
    if (document.getElementById('results').style.display !== 'none') calculateRevenue();
});

function updateExchangeOptions() {
    const from = document.getElementById('depositCurrency').value;
    const to = document.getElementById('taskCurrency').value;
    const exchangeSection = document.getElementById('exchangeSection');
    const exchangeFeeInput = document.getElementById('exchangeFee');
    const exchangeFeeGroup = document.getElementById('exchangeFeeGroup');

    if (!from || !to || from === to) {
        exchangeSection.style.display = 'none';
        exchangeFeeGroup.style.display = 'block';
        exchangeFeeInput.readOnly = false;
        exchangeFeeInput.value = 0;
        return;
    }

    exchangeSection.style.display = 'block';
    exchangeSection.innerHTML = '';
    let isManual = true;

    if (['USD', 'EUR'].includes(from) && to === 'RUB') {
        isManual = false;
        exchangeSection.innerHTML = `
            <h3>Источник курса обмена</h3>
            <select id="exchangeSource" class="form-control">
                <option value="4.95">Стандартный курс банка ЦБ + комиссия 4.95%</option>
            </select>
            <div class="checkbox-group">
                <input type="checkbox" id="showLgot">
                <label for="showLgot">Показать льготный вариант</label>
            </div>
            <div id="lgotWarning" class="alert alert-warning" style="display: none;">
                Льготный курс доступен при обороте от 50 000$ в месяц
            </div>
        `;
        
        document.getElementById('showLgot').addEventListener('change', function() {
            const select = document.getElementById('exchangeSource');
            const warning = document.getElementById('lgotWarning');
            if (this.checked) {
                if (select.options.length === 1) {
                    const opt = document.createElement('option');
                    opt.value = '3';
                    opt.textContent = 'Льготный курс (Forex) + комиссия 3%';
                    select.appendChild(opt);
                }
                warning.style.display = 'block';
            } else {
                if (select.options.length > 1) select.remove(1);
                warning.style.display = 'none';
            }
            setExchangeFee(select.value);
        });
        
        document.getElementById('exchangeSource').addEventListener('change', function() {
            setExchangeFee(this.value);
        });
        
        setExchangeFee('4.95');
    } else if ((from === 'USD' && to === 'EUR') || (from === 'EUR' && to === 'USD')) {
        isManual = false;
        exchangeSection.innerHTML = `
            <h3>Комиссия за обмен</h3>
            <select id="exchangeSource" class="form-control">
                <option value="2.213">Стандартный курс Европейского ЦБ + 2.213%</option>
                <option value="2">Стандартный курс Европейского ЦБ + 2%</option>
            </select>
        `;
        document.getElementById('exchangeSource').addEventListener('change', function() {
            setExchangeFee(this.value);
        });
        setExchangeFee('2.213');
    } else if (from === 'USD' && to === 'USDT') {
        isManual = false;
        exchangeSection.innerHTML = `
            <h3>Комиссия за обмен (нет биржевого курса)</h3>
            <select id="exchangeSource" class="form-control">
                <option value="0">0%</option>
                <option value="2.2">2.2%</option>
                <option value="2">2%</option>
                <option value="1">1%</option>
                <option value="0.8">0.8%</option>
            </select>
        `;
        document.getElementById('exchangeSource').addEventListener('change', function() {
            setExchangeFee(this.value);
        });
        setExchangeFee('0');
    } else if (from === 'EUR' && to === 'USDT') {
        isManual = false;
        exchangeSection.innerHTML = `
            <h3>Комиссия за обмен через USD</h3>
            <div class="alert alert-info">💱 Обмен идет через дополнительную валюту!</div>
            <select id="exchangeSource" class="form-control">
                <option value="4.413">4.413%</option>
                <option value="4.2">4.2%</option>
                <option value="4">4%</option>
                <option value="3.213">3.213%</option>
                <option value="3">3%</option>
                <option value="2.8">2.8%</option>
            </select>
        `;
        document.getElementById('exchangeSource').addEventListener('change', function() {
            setExchangeFee(this.value);
        });
        setExchangeFee('4.413');
    }

    if (isManual) {
        exchangeSection.innerHTML = `
            <h3>Ручной обмен валют</h3>
            <div class="alert alert-info">💱 Обмен идет через дополнительную валюту!</div>
            <div class="alert alert-warning">Требуется ручной обмен. Комиссия устанавливается индивидуально.</div>
        `;
        exchangeFeeGroup.style.display = 'block';
        exchangeFeeInput.readOnly = false;
    } else {
        exchangeFeeGroup.style.display = 'none';
        exchangeFeeInput.readOnly = true;
    }
}

function setExchangeFee(value) {
    document.getElementById('exchangeFee').value = value;
    if (document.getElementById('results').style.display !== 'none') calculateRevenue();
}

function calculateRevenue() {
    const performersCount = parseInt(document.getElementById('performersCount').value) || 0;
    const avgTaskValue = parseFloat(document.getElementById('avgTaskValue').value) || 0;
    const taskCommission = parseFloat(document.getElementById('taskCommission').value) || 0;
    const exchangeFee = parseFloat(document.getElementById('exchangeFee').value) || 0;
    const withdrawalFee = parseFloat(document.getElementById('withdrawalFee').value) || 0;
    const clientPaysWithdrawal = document.getElementById('clientPaysWithdrawal').checked;

    if (performersCount === 0 || avgTaskValue === 0) {
        document.getElementById('results').style.display = 'none';
        return;
    }

    const totalTaskValue = performersCount * avgTaskValue;
    const commissionRevenue = totalTaskValue * (taskCommission / 100);
    const commissionExchange = totalTaskValue * (exchangeFee / 100);
    const commissionWithdrawal = totalTaskValue * (withdrawalFee / 100);
    const commissionTotal = commissionRevenue + commissionExchange + commissionWithdrawal;
    const totalRouteCost = (commissionTotal / totalTaskValue) * 100;
    
    let clientRouteCost, performerRouteCost;
    if (clientPaysWithdrawal) {
        clientRouteCost = totalRouteCost;
        performerRouteCost = ((commissionRevenue + commissionExchange) / totalTaskValue) * 100;
    } else {
        clientRouteCost = ((commissionRevenue + commissionExchange) / totalTaskValue) * 100;
        performerRouteCost = (commissionWithdrawal / totalTaskValue) * 100;
    }

    document.getElementById('commissionRevenue').textContent = `Доход от комиссии: $${commissionRevenue.toFixed(2)}`;
    document.getElementById('commissionExchange').textContent = `Доход от обмена валют: $${commissionExchange.toFixed(2)}`;
    document.getElementById('commissionWithdrawal').textContent = `Доход от вывода: $${commissionWithdrawal.toFixed(2)}`;
    document.getElementById('commissionTotal').textContent = `Общая выручка: $${commissionTotal.toFixed(2)}`;
    document.getElementById('totalRouteCost').textContent = `Общая стоимость маршрута: ${totalRouteCost.toFixed(2)}%`;
    document.getElementById('clientRouteCost').textContent = `Стоимость маршрута для заказчика: ${clientRouteCost.toFixed(2)}%`;
    document.getElementById('performerRouteCost').textContent = `Стоимость маршрута для исполнителя: ${performerRouteCost.toFixed(2)}%`;

    document.getElementById('results').style.display = 'block';
}