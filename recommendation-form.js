document.querySelector('#get-my-suggestion-btn').addEventListener('click', () => {
  const age = Number(document.querySelector('#age').value);
  const height = Number(document.querySelector('#height').value);
  const weight = Number(document.querySelector('#weight').value);
  if (!Number.isFinite(age) || age < 18 || age > 80 || !Number.isFinite(height) || height < 120 || height > 220 || !Number.isFinite(weight) || weight < 30 || weight > 250) {
    alert('Please enter a valid adult age, height, and weight to see your plan.');
    return;
  }
  const symptoms = ['skin-check', 'hair-check', 'period-check', 'excess-hair-check', 'weight-check', 'fatique-check']
    .filter(id => document.getElementById(id).checked);
  const query = new URLSearchParams({ age, height, weight, symptoms: symptoms.join(',') });
  location.href = `recommendation.html?${query}`;
});
