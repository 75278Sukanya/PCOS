function showMessage(element, message, type = 'error') {
  element.textContent = message;
  element.className = `auth-message ${type}`;
  element.hidden = !message;
}

async function request(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Please try again.');
  return data;
}

const signupForm = document.querySelector('#signup-form');
const oauthError = new URLSearchParams(location.search).get('error');
if (oauthError) {
  const message = document.querySelector('#auth-message');
  if (message) showMessage(message, oauthError);
}
if (signupForm) {
  const message = document.querySelector('#auth-message');
  signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = signupForm.querySelector('button[type="submit"]');
    if (!signupForm.terms.checked) return showMessage(message, 'Please accept the Terms and Privacy Policy.');
    button.disabled = true; button.textContent = 'Creating account…'; showMessage(message, '');
    try {
      await request('/api/auth/signup', { firstName: signupForm.firstName.value, lastName: signupForm.lastName.value, email: signupForm.email.value, password: signupForm.password.value });
      showMessage(message, 'Account created. Let’s add your reports…', 'success');
      location.replace('report-plan.html');
    } catch (error) { showMessage(message, error.message); }
    finally { button.disabled = false; button.textContent = 'Create account'; }
  });
}

const loginForm = document.querySelector('#login-form');
if (loginForm) {
  const message = document.querySelector('#auth-message');
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true; button.textContent = 'Signing in…'; showMessage(message, '');
    try {
      await request('/api/auth/login', { email: loginForm.email.value, password: loginForm.password.value, remember: loginForm.remember.checked });
      location.replace('report-plan.html');
    } catch (error) { showMessage(message, error.message); }
    finally { button.disabled = false; button.textContent = 'Sign in'; }
  });
}
