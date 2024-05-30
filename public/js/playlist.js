document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.querySelector('.custom-file-input');
    const fileLabel = document.querySelector('.custom-file-label');
    const fileContainer = document.querySelector('.file-container');
    const fileList = [];

    fileInput.addEventListener('change', function(event) {
      fileList.length = 0; // Reset fileList
      const files = Array.from(event.target.files);
      files.forEach((file, index) => {
        fileList.push({ file, index });
      });
      updateFileListDisplay();
    });

    function updateFileListDisplay() {
      fileContainer.innerHTML = ''; // Clear the container
      fileList.forEach((fileObj, index) => {
        const fileItem = document.createElement('div');
        fileItem.classList.add('file-item', 'mb-2');
        fileItem.innerHTML = `
          <div class="row">
            <div class="col-md-8">
              ${fileObj.file.type.startsWith('image/') ? `<img src="${URL.createObjectURL(fileObj.file)}" alt="Preview" class="img-thumbnail" width="100">` : ''}
              ${fileObj.file.type === 'video/mp4' ? `<video width="100" controls><source src="${URL.createObjectURL(fileObj.file)}" type="video/mp4"></video>` : ''}
              <p>${fileObj.file.name}</p>
            </div>
            <div class="col-md-4 text-right">
              <button type="button" class="btn btn-danger btn-sm" onclick="removeFile(${index})">Remove</button>
            </div>
          </div>
        `;
        fileContainer.appendChild(fileItem);
      });
      fileLabel.textContent = fileList.length ? `${fileList.length} files selected` : 'Choose files';
    }

    function removeFile(index) {
      fileList.splice(index, 1);
      updateFileListDisplay();
    }

    const form = document.querySelector('form');
    form.addEventListener('submit', function(event) {
      event.preventDefault();
      const formData = new FormData();
      fileList.forEach(fileObj => {
        formData.append('myImages', fileObj.file);
      });
      fetch(form.action, {
        method: 'POST',
        body: formData
      })
      .then(response => response.text())
      .then(data => {
        document.body.innerHTML = data; // Replace the body with the response data
      })
      .catch(error => console.error('Error:', error));
    });

    window.removeFile = removeFile; // Make removeFile globally accessible
  });

  $('.custom-file-input').on('change', function(event) {
  var inputFile = event.currentTarget;
  $(inputFile).parent().find('.custom-file-label').html(inputFile.files.length + ' files selected');
});


function confirmDelete(publicId) {
  return confirm('Are you sure you want to delete this image?');
}   
