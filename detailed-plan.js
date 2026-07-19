const savedProfile = sessionStorage.getItem('pcosReportProfile');
if (!savedProfile) location.replace('report-plan.html');

const profile = JSON.parse(savedProfile || '{}');
const hasMeasurements = Number.isFinite(profile.height) && profile.height >= 120 && profile.height <= 220 && Number.isFinite(profile.weight) && profile.weight >= 30 && profile.weight <= 250;
const bmi = hasMeasurements ? profile.weight / ((profile.height / 100) ** 2) : null;
const higherWeight = bmi >= 25;
const lowerWeight = bmi < 18.5;
const protein = Math.round(profile.weight * (higherWeight ? 1.2 : lowerWeight ? 1.25 : 1.1));
const flour = higherWeight ? 35 : lowerWeight ? 70 : 50;
const rice = higherWeight ? 100 : lowerWeight ? 180 : 140;
const cookedProtein = lowerWeight ? 140 : 120;
const steps = higherWeight ? '7,000-9,000' : lowerWeight ? '5,500-7,000' : '6,000-8,000';
const uploaded = [profile.bloodReportName, profile.usgReportName].filter(Boolean);

document.querySelector('#title').textContent = 'Your detailed PCOS wellness plan';
document.querySelector('#summary').textContent = hasMeasurements
  ? `Based on ${profile.height} cm and ${profile.weight} kg. Your starting portions and workout volume are tailored to these details.`
  : 'Add your height and weight to see personalised starting portions and movement targets.';
document.querySelector('#plan').innerHTML = `
  <div class="grid">
    <section class="card"><h2>Your daily starting targets</h2>${hasMeasurements ? `<div class="stat"><span><strong>${bmi.toFixed(1)}</strong>BMI</span><span><strong>${protein} g</strong>protein/day</span><span><strong>${steps}</strong>steps/day</span></div><p class="muted">Starting wellness targets only. Adjust for appetite, medical advice, pregnancy and activity level.</p>` : '<div class="signal flag"><b>Starting details needed</b><span>Add your height and weight to calculate your BMI, protein goal and walking range.</span></div>'}</section>
    <section class="card"><h2>Files added</h2><div class="signals"><div class="signal"><b>Ready for a clinician’s review</b><span>${profile.usgReportName ? 'Blood report and USG report have been selected.' : 'Blood report has been selected. Add the USG later when it is ready.'} The app does not read or interpret the values inside these files yet.</span></div></div><ul class="focus-list report-list">${uploaded.map(name => `<li>${name}</li>`).join('')}</ul></section>
    <section class="card wide"><h2>Your food chart: quantities for one day</h2>
      <div class="meal"><b>Breakfast</b><span class="detail">Choose one: 2 eggs (100 g) + ${flour} g oats/poha/upma dry weight; paneer 100 g + 1 roti made from ${flour} g flour; or tofu 150 g + 1 fruit (100-150 g). Add 150 g vegetables where possible.</span></div>
      <div class="meal"><b>Lunch</b><span class="detail">${cookedProtein} g cooked chicken/fish, or paneer 120 g, or tofu 180 g, or cooked dal/beans 220 g; plus ${higherWeight ? '1 roti from 35 g flour or' : '1-2 rotis from ' + flour + ' g flour or'} ${rice} g cooked rice; 250 g vegetables; 1 tsp oil/ghee.</span></div>
      <div class="meal"><b>Snack</b><span class="detail">Choose one: roasted chana 35 g; unsweetened curd 200 g; fruit 100-150 g with 15 g nuts; or buttermilk 250 mL with sprouts 100 g.</span></div>
      <div class="meal"><b>Dinner</b><span class="detail">Repeat the lunch plate with ${cookedProtein} g cooked protein, 200-250 g vegetables, and either 1 roti from ${flour} g flour or ${Math.round(rice * .75)} g cooked rice. If you are hungry later, use milk/curd 200 mL/g rather than skipping dinner.</span></div>
    </section>
    <section class="card wide"><h2>Daily food add-ons</h2>
      <p class="muted intro">Use one simple add-on at a time. These are foods, not a replacement for prescribed supplements or medical care.</p>
      <div class="add-on-grid">
        <div class="add-on"><span class="add-on-time">Mid-morning</span><b>Fruit + nuts</b><p>Have 1 fruit (100-150 g) with 10-15 g nuts: for example, guava, orange, apple, pear, papaya or pomegranate with 3 almonds and 1 walnut.</p></div>
        <div class="add-on"><span class="add-on-time">With fruit or snack</span><b>Seeds</b><p>Choose 1 tbsp (10-15 g) a day: pumpkin seeds for a hair-focused food routine, sunflower seeds on alternate days for variety, or 1 tsp ground flaxseed mixed into curd, dal or salad.</p></div>
        <div class="add-on"><span class="add-on-time">Only if relevant</span><b>Spearmint tea</b><p>Consider 1 cup after a meal only for unwanted facial hair or acne concerns, if it suits you and your clinician agrees. It is not needed for every person with PCOS.</p></div>
      </div>
      <p class="gentle-note">If you are pregnant, trying to conceive, taking medicines, or have a medical condition, ask your clinician before using herbal teas or any tablet/capsule supplement.</p>
    </section>
    <section class="card wide"><h2>Food adjustments after report review</h2>
      <p class="muted intro">Once a clinician has reviewed your report, this section can make everyday choices easier. It does not change your treatment plan.</p>
      <div class="meal"><b>If your blood sugar or cholesterol needs extra care</b><span class="detail">Keep the protein portions listed above, choose the smaller roti/rice option at lunch and dinner, have whole fruit rather than juice, and make vegetables part of every main meal. Limit sugary drinks and packaged snacks most days.</span></div>
      <div class="meal"><b>If your vitamin levels are low</b><span class="detail">Keep regular protein meals. Eggs, dairy, fish and fortified foods can help, but a low result may need a supplement chosen by your clinician. Please do not start a high-dose supplement on your own.</span></div>
      <div class="meal"><b>If a hormone result needs follow-up</b><span class="detail">Keep meals balanced and avoid crash diets. Your clinician will explain what the result means and whether you need treatment or another test. Food supports your routine; it cannot treat a hormone result by itself.</span></div>
    </section>
    <section class="card wide"><h2>Your weekly workout plan</h2>
      <p class="muted intro">Choose a pace that leaves you feeling better, not exhausted. Walking is a complete choice; the other options are there when they suit your routine.</p>
      <div class="movement-calendar">
        <div class="schedule strength-day"><b>Monday + Thursday</b><p>Strength, 25-30 min: chair squat, glute bridge, wall/incline push-up, backpack row, overhead press and dead bug. Do 2 sets of 8-12 slow, controlled reps.</p></div>
        <div class="schedule walk-day"><b>Tuesday + Saturday</b><p><strong>One session only, 25-30 min.</strong> Choose a brisk walk, cycling, dance or swimming. You should breathe a little harder but still be able to speak in short sentences.</p></div>
        <div class="schedule restore-day"><b>Wednesday</b><p>Gentle yoga or mobility for 15-20 min, or simply take an easy walk if that feels better.</p></div>
        <div class="schedule flexible-day"><b>Friday</b><p>Rest, or repeat one session you enjoyed this week for up to 20 min. Skip it if you need recovery.</p></div>
        <div class="schedule rest-day"><b>Sunday</b><p>Rest or take an easy walk. Stop and seek qualified advice for chest pain, fainting, severe breathlessness, injury, pregnancy-related restrictions or significant pelvic pain.</p></div>
      </div>
    </section>
    <section class="card wide"><h2>Choose a movement that feels good</h2><div class="movement-options"><a class="movement-option walk-option" href="https://www.youtube.com/results?search_query=beginner+low+impact+walking+workout" target="_blank" rel="noopener"><span>Most practical</span><b>Low-impact walking</b><small>At home or outdoors, no equipment needed</small></a><a class="movement-option strength-option" href="https://www.youtube.com/results?search_query=beginner+bodyweight+strength+workout+no+equipment" target="_blank" rel="noopener"><span>Build strength</span><b>Beginner bodyweight</b><small>Simple movements using your body weight</small></a><a class="movement-option yoga-option" href="https://www.youtube.com/results?search_query=Yoga+With+Adriene+gentle+yoga+beginners" target="_blank" rel="noopener"><span>Gentle day</span><b>Yoga and mobility</b><small>For stretching, recovery and relaxation</small></a></div></section>
  </div>`;

function createPlanPdf(text) {
  const encoder = new TextEncoder();
  const lines = String(text)
    .replace(/[^\x20-\x7E\n]/g, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(line => line.match(/.{1,86}(?:\s|$)|.{1,86}/g) || ['']);
  const pages = [];
  for (let index = 0; index < lines.length; index += 42) pages.push(lines.slice(index, index + 42));

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`
  ];
  pages.forEach((pageLines, index) => {
    const pageNumber = 3 + index * 2;
    const streamNumber = pageNumber + 1;
    const body = ['BT', '/F1 11 Tf', '50 790 Td', ...pageLines.flatMap((line, lineIndex) => [
      `(${line.replace(/[\\()]/g, '\\$&')}) Tj`,
      lineIndex < pageLines.length - 1 ? '0 -17 Td' : ''
    ]), 'ET'].filter(Boolean).join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${streamNumber} 0 R >>`,
      `<< /Length ${encoder.encode(body).length} >>\nstream\n${body}\nendstream`
    );
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const startXref = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

const downloadButton = document.querySelector('#download');
downloadButton.addEventListener('click', () => {
  const originalLabel = downloadButton.textContent;
  downloadButton.disabled = true;
  downloadButton.textContent = 'Preparing your PDF...';
  try {
    const url = URL.createObjectURL(createPlanPdf(document.querySelector('.page').innerText));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-detailed-pcos-plan.pdf';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    alert('Your PDF could not be created. Please try again.');
  } finally {
    downloadButton.disabled = false;
    downloadButton.textContent = originalLabel;
  }
});
