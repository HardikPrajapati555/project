


document.getElementById("searchInput").addEventListener("input", function() {
    // Retrieve the search query
    var searchQuery = this.value.toLowerCase();

    // Get all table rows
    var rows = document.getElementById("myTable").getElementsByTagName("tr");

    // Loop through each row
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var found = false;

        // Loop through each cell in the row
        var cells = row.getElementsByTagName("td");
        for (var j = 0; j < cells.length; j++) {
            var cell = cells[j];
            var cellText = cell.textContent || cell.innerText;

            // Check if the cell text contains the search query
            if (cellText.toLowerCase().indexOf(searchQuery) > -1) {
                found = true;
                break;
            }
        }

        // Show or hide the row based on whether the search query was found
        row.style.display = found ? "" : "none";
    }
});


function removeRow(button) {
  // Find the row to remove
  const row = button.parentElement.parentElement;
  // Hide the row
  row.style.display = 'none';
}



function toggleDeletedData() {
        const deletedDataSection = document.getElementById("deletedData");
        if (deletedDataSection.style.display === "none") {
            deletedDataSection.style.display = "block";
            // You can fetch and populate deleted data here if needed
            // For now, let's assume deletedData is an array containing deleted data
            populateDeletedData(deletedData);
        } else {
            deletedDataSection.style.display = "none";
        }
    }

    function populateDeletedData(deletedData) {
        const deletedDataBody = document.getElementById("deletedDataBody");
        deletedDataBody.innerHTML = ""; // Clear existing rows

        deletedData.forEach(item => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.pairing_code}</td>
                <td>${item.screenname}</td>
                <td>${item.tag}</td>
                <td>${item.location}</td>
                <td>${item.city}</td>
                <td>${item.state}</td>
                <td>${item.country}</td>
                <td>${item.area}</td>
            `;
            deletedDataBody.appendChild(tr);
        });
    }



   tch(/users/deleteLocation/${locationId}, { method: 'DELETE' });



   //
   