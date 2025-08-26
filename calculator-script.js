const { jsPDF } = window.jspdf;
const specialCurrencies = ['AMD', 'KGS', 'AED', 'GBP', 'HKD'];

// Exchange rates and fees (simplified for demo)
const exchangeRates = {
    'USD_EUR': { rate: 0.85, fee: 2.213 },
    'USD_RUB': { rate: 93, fee: 4.95 },
    'RUB_EUR': { rate: 0.0092, fee: 3.5 },
    'EUR_RUB': { rate: 108, fee: 3.5 }
};

const withdrawalFees = {
    'EUR': 2.5,
    'USD': 2.5,
    'RUB': 1.5
};

function switchTab(tab) {
    const calculatorTab = document.getElementById('calculatorTab');
    const tracingTab = document.getElementById('tracingTab');
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'calculator') {
        calculatorTab.style.display = 'block';
        tracingTab.style.display = 'none';
        document.querySelector('[onclick="switchTab(\'calculator\')"]').classList.add('active');
    } else {
        calculatorTab.style.display = 'none';
        tracingTab.style.display = 'block';
        document.querySelector('[onclick="switchTab(\'tracing\')"]').classList.add('active');
    }
}

function selectScenario(scenarioNumber) {
    // Remove active class from all scenario buttons
    document.querySelectorAll('.scenario-btn').forEach(btn => btn.classList.remove('active'));
    
    // Add active class to selected button
    event.target.classList.add('active');
    
    const amount = parseFloat(document.getElementById('traceAmount').value) || 1000;
    const descriptionDiv = document.getElementById('scenarioDescription');
    const flowDiv = document.getElementById('paymentFlow');
    
    descriptionDiv.style.display = 'block';
    flowDiv.style.display = 'block';
    
    let scenario;
    switch(scenarioNumber) {
        case 1:
            scenario = scenario1(amount);
            descriptionDiv.innerHTML = `
                <strong>Сценарий 1:</strong> Пополнение в USD, оплата исполнителю в USD, 
                исполнитель обменивает на EUR и выводит в EUR на свой счет.
            `;
            break;
        case 2:
            scenario = scenario2(amount);
            descriptionDiv.innerHTML = `
                <strong>Сценарий 2:</strong> Пополнение в USD, оплата исполнителю в USD, 
                исполнитель обменивает на RUB, затем RUB на EUR и выводит на карту в EUR.
            `;
            break;
        case 3:
            scenario = scenario3(amount);
            descriptionDiv.innerHTML = `
                <strong>Сценарий 3:</strong> Пополнение в USD, оплата исполнителю в USD, 
                исполнитель обменивает на RUB и выводит на карту в RUB.
            `;
            break;
        case 4:
            scenario = scenario4(amount);
            descriptionDiv.innerHTML = `
                <strong>Сценарий 4:</strong> Пополнение в USD, обмен на RUB, 
                оплата исполнителю в RUB на карту.
            `;
            break;
    }
    
    renderPaymentFlow(scenario);
}

function scenario1(amount) {
    // Scenario 1: USD deposit → USD payment → EUR exchange → EUR withdrawal
    const steps = [];
    let currentAmount = amount;
    
    steps.push({
        step: 1,
        description: "Пополнение счета",
        amount: currentAmount,
        currency: "USD",
        fee: 0,
        type: "deposit"
    });
    
    const taskFee = currentAmount * 0.025;
    currentAmount -= taskFee;
    steps.push({
        step: 2,
        description: "Комиссия за задачу (2.5%)",
        amount: currentAmount,
        currency: "USD",
        fee: taskFee,
        type: "fee"
    });
    
    steps.push({
        step: 3,
        description: "Платеж исполнителю",
        amount: currentAmount,
        currency: "USD",
        fee: 0,
        type: "payment"
    });
    
    const exchangeFee = currentAmount * (exchangeRates.USD_EUR.fee / 100);
    const afterExchangeFee = currentAmount - exchangeFee;
    const eurAmount = afterExchangeFee * exchangeRates.USD_EUR.rate;
    steps.push({
        step: 4,
        description: `Обмен USD → EUR (курс ${exchangeRates.USD_EUR.rate}, комиссия ${exchangeRates.USD_EUR.fee}%)`,
        amount: eurAmount,
        currency: "EUR",
        fee: exchangeFee,
        feeUSD: exchangeFee,
        type: "exchange"
    });
    
    const withdrawalFee = eurAmount * (withdrawalFees.EUR / 100);
    const finalAmount = eurAmount - withdrawalFee;
    steps.push({
        step: 5,
        description: `Вывод на счет в EUR (комиссия ${withdrawalFees.EUR}%)`,
        amount: finalAmount,
        currency: "EUR",
        fee: withdrawalFee,
        feeUSD: withdrawalFee / exchangeRates.USD_EUR.rate,
        type: "withdrawal"
    });
    
    return {
        steps: steps,
        initialAmount: amount,
        finalAmount: finalAmount,
        finalCurrency: "EUR",
        finalAmountUSD: finalAmount / exchangeRates.USD_EUR.rate
    };
}

function scenario2(amount) {
    // Scenario 2: USD deposit → USD payment → RUB exchange → EUR exchange → EUR withdrawal
    const steps = [];
    let currentAmount = amount;
    
    steps.push({
        step: 1,
        description: "Пополнение счета",
        amount: currentAmount,
        currency: "USD",
        fee: 0,
        type: "deposit"
    });
    
    const taskFee = currentAmount * 0.025;
    currentAmount -= taskFee;
    steps.push({
        step: 2,
        description: "Комиссия за задачу (2.5%)",
        amount: currentAmount,
        currency: "USD",
        fee: taskFee,
        type: "fee"
    });
    
    steps.push({
        step: 3,
        description: "Платеж исполнителю",
        amount: currentAmount,
        currency: "USD",
        fee: 0,
        type: "payment"
    });
    
    // USD → RUB
    const usdRubFee = currentAmount * (exchangeRates.USD_RUB.fee / 100);
    const afterUsdRubFee = currentAmount - usdRubFee;
    const rubAmount = afterUsdRubFee * exchangeRates.USD_RUB.rate;
    steps.push({
        step: 4,
        description: `Обмен USD → RUB (курс ${exchangeRates.USD_RUB.rate}, комиссия ${exchangeRates.USD_RUB.fee}%)`,
        amount: rubAmount,
        currency: "RUB",
        fee: usdRubFee,
        feeUSD: usdRubFee,
        type: "exchange"
    });
    
    // RUB → EUR
    const rubEurFee = rubAmount * (exchangeRates.RUB_EUR.fee / 100);
    const afterRubEurFee = rubAmount - rubEurFee;
    const eurAmount = afterRubEurFee * exchangeRates.RUB_EUR.rate;
    steps.push({
        step: 5,
        description: `Обмен RUB → EUR (курс ${exchangeRates.RUB_EUR.rate}, комиссия ${exchangeRates.RUB_EUR.fee}%)`,
        amount: eurAmount,
        currency: "EUR",
        fee: rubEurFee,
        feeUSD: (rubEurFee / exchangeRates.USD_RUB.rate),
        type: "exchange"
    });
    
    const withdrawalFee = eurAmount * (withdrawalFees.EUR / 100);
    const finalAmount = eurAmount - withdrawalFee;
    steps.push({
        step: 6,
        description: `Вывод на карту в EUR (комиссия ${withdrawalFees.EUR}%)`,
        amount: finalAmount,
        currency: "EUR",
        fee: withdrawalFee,
        feeUSD: withdrawalFee / exchangeRates.USD_EUR.rate,
        type: "withdrawal"
    });
    
    return {
        steps: steps,
        initialAmount: amount,
        finalAmount: finalAmount,
        finalCurrency: "EUR",
        finalAmountUSD: finalAmount / exchangeRates.USD_EUR.rate
    };
}

function scenario3(amount) {
    // Scenario 3: USD deposit → USD payment → RUB exchange → RUB withdrawal
    const steps = [];
    let currentAmount = amount;
    
    steps.push({
        step: 1,
        description: "Пополнение счета",
        amount: currentAmount,
        currency: "USD",
        fee: 0,
        type: "deposit"
    });
    
    const taskFee = currentAmount * 0.025;
    currentAmount -= taskFee;
    steps.push({
        step: 2,
        description: "Комиссия за задачу (2.5%)",
        amount: currentAmount,
        currency: "USD",
        fee: taskFee,
        type: "fee"
    });
    
    steps.push({
        step: 3,
        description: "Платеж исполнителю",
        amount: currentAmount,
        currency: "USD",
        fee: 0,
        type: "payment"
    });
    
    const exchangeFee = currentAmount * (exchangeRates.USD_RUB.fee / 100);
    const afterExchangeFee = currentAmount - exchangeFee;
    const rubAmount = afterExchangeFee * exchangeRates.USD_RUB.rate;
    steps.push({
        step: 4,
        description: `Обмен USD → RUB (курс ${exchangeRates.USD_RUB.rate}, комиссия ${exchangeRates.USD_RUB.fee}%)`,
        amount: rubAmount,
        currency: "RUB",
        fee: exchangeFee,
        feeUSD: exchangeFee,
        type: "exchange"
    });
    
    const withdrawalFee = rubAmount * (withdrawalFees.RUB / 100);
    const finalAmount = rubAmount - withdrawalFee;
    steps.push({
        step: 5,
        description: `Вывод на карту в RUB (комиссия ${withdrawalFees.RUB}%)`,
        amount: finalAmount,
        currency: "RUB",
        fee: withdrawalFee,
        feeUSD: withdrawalFee / exchangeRates.USD_RUB.rate,
        type: "withdrawal"
    });
    
    return {
        steps: steps,
        initialAmount: amount,
        finalAmount: finalAmount,
        finalCurrency: "RUB",
        finalAmountUSD: finalAmount / exchangeRates.USD_RUB.rate
    };
}

function scenario4(amount) {
    // Scenario 4: USD deposit → RUB exchange → RUB payment
    const steps = [];
    let currentAmount = amount;
    
    steps.push({
        step: 1,
        description: "Пополнение счета",
        amount: currentAmount,
        currency: "USD",
        fee: 0,
        type: "deposit"
    });
    
    const taskFee = currentAmount * 0.025;
    currentAmount -= taskFee;
    steps.push({
        step: 2,
        description: "Комиссия за задачу (2.5%)",
        amount: currentAmount,
        currency: "USD",
        fee: taskFee,
        type: "fee"
    });
    
    const exchangeFee = currentAmount * (exchangeRates.USD_RUB.fee / 100);
    const afterExchangeFee = currentAmount - exchangeFee;
    const rubAmount = afterExchangeFee * exchangeRates.USD_RUB.rate;
    steps.push({
        step: 3,
        description: `Обмен USD → RUB (курс ${exchangeRates.USD_RUB.rate}, комиссия ${exchangeRates.USD_RUB.fee}%)`,
        amount: rubAmount,
        currency: "RUB",
        fee: exchangeFee,
        feeUSD: exchangeFee,
        type: "exchange"
    });
    
    steps.push({
        step: 4,
        description: "Прямая оплата исполнителю на карту в RUB",
        amount: rubAmount,
        currency: "RUB",
        fee: 0,
        type: "payment"
    });
    
    return {
        steps: steps,
        initialAmount: amount,
        finalAmount: rubAmount,
        finalCurrency: "RUB",
        finalAmountUSD: rubAmount / exchangeRates.USD_RUB.rate
    };
}

function renderPaymentFlow(scenario) {
    const flowDiv = document.getElementById('paymentFlow');
    let html = '';
    
    scenario.steps.forEach(step => {
        const isLoss = step.fee > 0;
        html += `
            <div class="flow-step">
                <div class="step-number">${step.step}</div>
                <div class="step-content">
                    <div style="font-weight: 500;">${step.description}</div>
                    <div style="margin-top: 4px;">
                        <span class="step-amount">${step.amount.toFixed(2)} ${step.currency}</span>
                        ${isLoss ? `<span class="step-loss"> (комиссия: -${step.fee.toFixed(2)} ${step.currency}${step.feeUSD ? ` / -$${step.feeUSD.toFixed(2)}` : ''})</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
        <div class="final-amount">
            <h4>🎯 Итоговая сумма получателя</h4>
            <div class="amount">${scenario.finalAmount.toFixed(2)} ${scenario.finalCurrency}</div>
            <div style="margin-top: 8px; color: #6b7280;">
                Эквивалент в USD: $${scenario.finalAmountUSD.toFixed(2)}
            </div>
            <div style="margin-top: 8px; color: #dc2626; font-weight: 600;">
                Общие потери: $${(scenario.initialAmount - scenario.finalAmountUSD).toFixed(2)} 
                (${(((scenario.initialAmount - scenario.finalAmountUSD) / scenario.initialAmount) * 100).toFixed(2)}%)
            </div>
        </div>
    `;
    
    flowDiv.innerHTML = html;
}

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