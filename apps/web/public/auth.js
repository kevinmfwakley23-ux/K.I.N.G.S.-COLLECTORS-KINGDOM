const statusElement = document.querySelector("#auth-status");
const accountPanel = document.querySelector("#account-panel");
const accountSummary = document.querySelector("#account-summary");

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setStatus(message) {
  statusElement.textContent = message;
}

function showAccount(account) {
  accountSummary.textContent = `${account.displayName} • ${account.email}`;
  accountPanel.hidden = false;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? "The Kingdom could not complete that request.");
  return body;
}

document.querySelector("#register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const { account } = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(formObject(event.currentTarget))
    });
    setStatus(`Account created for ${account.displayName}. Sign in to enter your Kingdom.`);
    event.currentTarget.reset();
  } catch (error) {
    setStatus(error.message);
  }
});

document.querySelector("#signin-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const { account } = await api("/api/auth/sign-in", {
      method: "POST",
      body: JSON.stringify(formObject(event.currentTarget))
    });
    showAccount(account);
    setStatus("Secure sign-in complete.");
    event.currentTarget.reset();
  } catch (error) {
    setStatus(error.message);
  }
});

document.querySelector("#signout-button").addEventListener("click", async () => {
  try {
    await api("/api/auth/sign-out", { method: "POST", body: "{}" });
    accountPanel.hidden = true;
    setStatus("You have been securely signed out.");
  } catch (error) {
    setStatus(error.message);
  }
});

try {
  const { account } = await api("/api/auth/me", { method: "GET", headers: {} });
  showAccount(account);
  setStatus("Your active Kingdom session was restored.");
} catch {}
