const $ = selector => document.querySelector(selector);

function updateFileLabel(inputId, labelId) {
  const input = $(inputId);
  input.addEventListener('change', () => {
    $(labelId).textContent = input.files[0] ? `${input.files[0].name} selected` : 'Choose a PDF or image';
  });
}

updateFileLabel('#blood-file', '#blood-file-name');
updateFileLabel('#usg-file', '#usg-file-name');

$('#report-form').addEventListener('submit', event => {
  event.preventDefault();
  const bloodFile = $('#blood-file').files[0];
  const height = Number($('#height').value);
  const weight = Number($('#weight').value);
  if (!bloodFile || !Number.isFinite(height) || height < 120 || height > 220 || !Number.isFinite(weight) || weight < 30 || weight > 250) {
    $('#form-error').textContent = 'Please upload your blood report and enter a valid height and weight to continue.';
    return;
  }
  sessionStorage.setItem('pcosReportProfile', JSON.stringify({
    bloodReportName: bloodFile.name,
    usgReportName: $('#usg-file').files[0]?.name || null,
    height,
    weight
  }));
  location.href = 'detailed-plan.html';
});
