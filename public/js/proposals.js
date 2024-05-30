document.getElementById('openFormBtn').addEventListener('click', function (event) {
    event.preventDefault();
    document.getElementById('proposalModal').style.display = 'block';
});

document.getElementsByClassName('close')[0].addEventListener('click', function () {
    document.getElementById('proposalModal').style.display = 'none';
});

window.addEventListener('click', function (event) {
    if (event.target == document.getElementById('proposalModal')) {
        document.getElementById('proposalModal').style.display = 'none';
    }
});

document.getElementById('nextStepBtn').addEventListener('click', function () {
    document.getElementById('formStep1').style.display = 'none';
    document.getElementById('formStep2').style.display = 'block';
});

document.getElementById('addCityBtn').addEventListener('click', function () {
    const cityInput = document.getElementById('city');
    const city = cityInput.value.trim();
    if (city) {
        const cityItem = document.createElement('li');
        cityItem.textContent = city;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', function () {
            cityItem.remove();
        });
        cityItem.appendChild(removeBtn);
        document.getElementById('citiesList').appendChild(cityItem);
        cityInput.value = '';
    }
});

document.getElementById('proposalFormStep2').addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const summary = document.getElementById('summary').value;
    const inventoryStatus = document.getElementById('inventoryStatus').value;
    const reach = document.getElementById('reach').value;

    const clientName = document.getElementById('clientName').value;
    const startOn = document.getElementById('startOn').value;
    const runsFor = document.getElementById('runsFor').value;
    const slotDuration = document.getElementById('slotDuration').value;
    const cities = Array.from(document.getElementById('citiesList').children).map(cityItem => cityItem.firstChild.textContent);
    const propertyType = document.getElementById('propertyType').value;
    const plan = document.getElementById('plan').value;
    const advertisementTag = document.getElementById('advertisementTag').value;

    const proposalRow = document.createElement('tr');
    proposalRow.innerHTML = `
        <td>${name}</td>
        <td>${summary}</td>
        <td>${inventoryStatus}</td>
        <td>${reach}</td>
        <td class="actions">
            <button onclick="discardProposal(this)">Discard</button>
        </td>
    `;

    document.getElementById('proposals').appendChild(proposalRow);

    document.getElementById('proposalModal').style.display = 'none';
    document.getElementById('proposalFormStep1').reset();
    document.getElementById('proposalFormStep2').reset();
    document.getElementById('formStep1').style.display = 'block';
    document.getElementById('formStep2').style.display = 'none';
    document.getElementById('citiesList').innerHTML = '';
});

function discardProposal(button) {
    const row = button.closest('tr');
    row.remove();
}