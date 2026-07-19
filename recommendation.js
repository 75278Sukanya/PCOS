const params = new URLSearchParams(location.search);
const profile = {
  age: Number(params.get('age')),
  height: Number(params.get('height')),
  weight: Number(params.get('weight')),
  symptoms: new Set((params.get('symptoms') || '').split(',').filter(Boolean))
};

const bmi = profile.weight / ((profile.height / 100) ** 2);
const symptom = id => profile.symptoms.has(id);
const hasFatigue = symptom('fatique-check');
const hasWeightGain = symptom('weight-check');
const hasSkinConcern = symptom('skin-check');
const hasHairConcern = symptom('hair-check') || symptom('excess-hair-check');
const hasCycleConcern = symptom('period-check');
const goal = bmi < 18.5 ? 'restore energy and support strength' : bmi >= 25 ? 'support gradual, sustainable fat loss' : 'maintain weight and support metabolic health';
const proteinFactor = bmi < 18.5 ? 1.15 : bmi >= 25 ? 1.2 : 1.1;
const protein = Math.round(profile.weight * proteinFactor);
const bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
const mealEnergy = Math.max(1350, Math.round((bmr * (hasFatigue ? 1.28 : 1.38) + (bmi < 18.5 ? 150 : bmi >= 25 ? -200 : 0)) / 50) * 50);
const energyBand = mealEnergy >= 1900 ? 1 : mealEnergy < 1600 ? -1 : 0;
const breakfastFlour = bmi < 18.5 ? 70 : bmi >= 25 ? 35 : (energyBand > 0 ? 70 : 35);
const mainFlour = bmi < 18.5 ? 105 : bmi >= 25 ? (profile.weight >= 90 ? 70 : 35) : (energyBand > 0 ? 70 : 35);
const dinnerFlour = bmi < 18.5 ? 70 : bmi >= 25 ? 35 : (energyBand > 0 ? 70 : 35);
const rice = Math.round(mainFlour * 2 / 25) * 25;
const breakfastProtein = Math.round(protein * 0.28);
const mainProtein = Math.round(protein * 0.36);
const dinnerProtein = Math.round(protein * 0.28);
const eggCount = Math.max(2, Math.round(breakfastProtein / 6));
const paneerBreakfast = Math.round((breakfastProtein / 0.18) / 10) * 10;
const tofuBreakfast = Math.round((breakfastProtein / 0.12) / 10) * 10;
const chickenMain = Math.round((mainProtein / 0.31) / 10) * 10;
const paneerMain = Math.round((mainProtein / 0.18) / 10) * 10;
const tofuMain = Math.round((mainProtein / 0.12) / 10) * 10;
const dalTofuTopUp = Math.max(100, Math.round(((mainProtein - 11) / 0.12) / 10) * 10);
const dinnerChicken = Math.round((dinnerProtein / 0.31) / 10) * 10;
const dinnerPaneer = Math.round((dinnerProtein / 0.18) / 10) * 10;
const dinnerTofu = Math.round((dinnerProtein / 0.12) / 10) * 10;
const dinnerDalTofuTopUp = Math.max(80, Math.round(((dinnerProtein - 11) / 0.12) / 10) * 10);

const breakfast = `${eggCount} eggs (about ${eggCount * 50} g), or paneer (${paneerBreakfast} g), or tofu (${tofuBreakfast} g); ${breakfastFlour} g flour as roti/dosa/oats; 150 g vegetables.`;
const lunch = `Chicken/fish (${chickenMain} g cooked), paneer (${paneerMain} g), tofu (${tofuMain} g), or cooked dal/beans (250 g) with tofu (${dalTofuTopUp} g); ${mainFlour} g flour as roti, or ${rice} g cooked rice; 200 g vegetables.`;
const dinner = `Chicken/fish (${dinnerChicken} g cooked), paneer (${dinnerPaneer} g), tofu (${dinnerTofu} g), or cooked dal/beans (250 g) with tofu (${dinnerDalTofuTopUp} g); ${dinnerFlour} g flour as roti, or ${Math.max(75, Math.round(dinnerFlour * 2 / 25) * 25)} g cooked rice; 200 g vegetables.`;
const snackProtein = Math.max(15, Math.round(protein * 0.16));
const snack = `Roasted chana (${Math.round(snackProtein / 0.2 / 5) * 5} g), or unsweetened curd (${Math.round(snackProtein / 0.1 / 10) * 10} g), or tofu (${Math.round(snackProtein / 0.12 / 10) * 10} g), with fruit (100-150 g).`;

const stepBase = Math.round((bmi < 18.5 ? 5200 : bmi >= 25 ? 6500 : 6000) + Math.min(1400, Math.max(-700, (profile.height - 160) * 12 + (profile.weight - 60) * 18)));
const stepLow = hasFatigue ? Math.max(4500, stepBase - 700) : stepBase;
const stepHigh = Math.min(10000, stepLow + (hasFatigue ? 1200 : 1800));
const cardioDays = hasFatigue ? 2 : (bmi >= 25 || hasWeightGain ? 4 : 3);
const cardioMinutes = hasFatigue ? 20 : (bmi >= 25 || hasWeightGain ? 35 : 30);
const strengthDays = bmi < 18.5 || hasHairConcern || hasCycleConcern ? 3 : 2;
const strengthSets = profile.age >= 40 || strengthDays === 3 ? 3 : 2;
const cardioStyle = hasFatigue ? 'easy-paced walk, gentle cycling, or low-impact dance' : bmi >= 25 ? 'brisk walk, cycling, or low-impact Zumba' : 'brisk walk, cycling, swimming, or Zumba';
const strength = `${strengthDays} days - ${strengthSets} sets each: chair squat, glute bridge, wall/incline push-up, backpack row, overhead press, and dead bug (8-12 reps).`;
const extras = [];
if (hasSkinConcern) extras.push('Acne/oily skin: choose the tofu or dal/beans options more often if dairy appears to worsen symptoms.');
if (hasHairConcern) extras.push('Hair concern: include spinach or other leafy vegetables (100 g) and pumpkin seeds (15 g) on most days.');
if (hasFatigue) extras.push('Fatigue: keep cardio low-impact and include a clinician review for persistent tiredness.');
if (hasCycleConcern) extras.push('Irregular periods: seek medical advice if a period is absent for 90 days.');

const html = `
  <div class="grid">
    <section class="card"><h2>Your daily target</h2><div class="stat"><span><strong>${bmi.toFixed(1)}</strong>BMI</span><span><strong>${protein} g</strong>protein/day</span></div><p class="muted">Focus: ${goal}. Portions are calculated from your age, height, weight, and selected symptoms.</p></section>
    <section class="card"><h2>Movement target</h2><div class="stat"><span><strong>${stepLow.toLocaleString()}-${stepHigh.toLocaleString()}</strong>daily walking</span></div><p class="muted">${cardioDays} cardio days and ${strengthDays} strength days each week.</p></section>
    <section class="card wide"><h2>Food quantities</h2>
      <div class="item"><b>Breakfast</b><span>${breakfast}</span></div>
      <div class="item"><b>Lunch</b><span>${lunch}</span></div>
      <div class="item"><b>Snack</b><span>${snack}</span></div>
      <div class="item"><b>Dinner</b><span>${dinner}</span></div>
    </section>
    <section class="card wide"><h2>Your movement mix</h2>
      <div class="workout"><b>Cardio</b><span>${cardioDays} days - ${cardioMinutes} minutes: ${cardioStyle}.</span></div>
      <div class="workout"><b>Strength</b><span>${strength}</span></div>
      <div class="workout"><b>Mobility</b><span>1 day - 20 minutes of gentle yoga or mobility work.</span></div>
    </section>
    ${extras.length ? `<section class="card wide"><h2>Relevant detail</h2>${extras.map(x => `<div class="item">${x}</div>`).join('')}</section>` : ''}
  </div>`;

document.querySelector('#summary').textContent = `Based on ${profile.age} years, ${profile.height} cm, and ${profile.weight} kg.`;
document.querySelector('#plan').innerHTML = html;
document.querySelector('#download').addEventListener('click', async () => {
  const content = document.querySelector('.page').innerText;
  const response = await fetch('/api/recommendation-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
  if (!response.ok) return alert('Your PDF could not be created. Please try again.');
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement('a'), { href: url, download: 'my-pcos-plan.pdf' });
  link.click(); URL.revokeObjectURL(url);
});
