document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  // Switch between login and signup pages
  if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
    document.getElementById("showSignup")?.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "signup.html";
    });
  }

  if (window.location.pathname.includes("signup.html")) {
    document.getElementById("showLogin")?.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "index.html";
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", e => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const pass = document.getElementById("loginPassword").value;
      
      // Show loading spinner
      const spinner = document.getElementById("loginSpinner");
      if (spinner) spinner.style.display = "inline-block";
      
      // Check if user exists in localStorage
      const userData = localStorage.getItem(email);
      if (!userData) {
        alert("No account found with this email!");
        if (spinner) spinner.style.display = "none";
        return;
      }
      
      try {
        const user = JSON.parse(userData);
        if (user && user.password === pass) {
          localStorage.setItem("currentUser", email);
          window.location.href = "dashboard.html";
        } else {
          alert("Invalid credentials!");
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        alert("Error accessing account data. Please try again.");
      } finally {
        if (spinner) spinner.style.display = "none";
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("signupName").value;
      const email = document.getElementById("signupEmail").value;
      const pass = document.getElementById("signupPassword").value;
      
      if (!name || !email || !pass) {
        alert("Please fill all fields!");
        return;
      }
      
      if (localStorage.getItem(email)) {
        alert("User already exists!");
        return;
      }
      
      // Show loading spinner
      const spinner = document.getElementById("signupSpinner");
      if (spinner) spinner.style.display = "inline-block";
      
      // Save user data
      const userData = {
        name,
        email,
        password: pass,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem(email, JSON.stringify(userData));
      localStorage.setItem("currentUser", email);
      
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    });
  }

  // Password strength meter
  const passwordInput = document.getElementById("signupPassword");
  const strengthMeter = document.getElementById("passwordStrength");
  const strengthText = document.getElementById("passwordStrengthText");
  
  if (passwordInput && strengthMeter && strengthText) {
    passwordInput.addEventListener("input", () => {
      const password = passwordInput.value;
      let strength = 0;
      let message = "";
      
      if (password.length > 5) strength++;
      if (password.length > 7) strength++;
      if (/[A-Z]/.test(password)) strength++;
      if (/[0-9]/.test(password)) strength++;
      if (/[^A-Za-z0-9]/.test(password)) strength++;
      
      if (password.length === 0) {
        strengthMeter.className = "password-strength";
        strengthText.textContent = "Password strength";
      } else if (strength < 2) {
        strengthMeter.className = "password-strength strength-weak";
        strengthText.textContent = "Weak password";
      } else if (strength < 4) {
        strengthMeter.className = "password-strength strength-fair";
        strengthText.textContent = "Fair password";
      } else if (strength < 5) {
        strengthMeter.className = "password-strength strength-good";
        strengthText.textContent = "Good password";
      } else {
        strengthMeter.className = "password-strength strength-strong";
        strengthText.textContent = "Strong password";
      }
    });
  }

  // Forgot password functionality
  const forgotPasswordLink = document.getElementById("forgotPassword");
  const forgotPasswordPage = document.getElementById("forgotPassword-page");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  
  if (forgotPasswordLink && forgotPasswordPage) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      forgotPasswordPage.classList.add("active");
    });
  }
  
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("resetEmail").value;
      
      if (!localStorage.getItem(email)) {
        alert("No account found with this email!");
        return;
      }
      
      alert(`Password reset instructions sent to ${email}`);
      forgotPasswordPage.classList.remove("active");
    });
  }
});

// Social login function
function socialLogin(provider) {
  alert(`Logging in with ${provider} (this is a demo)`);
}

// Show/hide page overlays
function showPage(pageId) {
  const page = document.getElementById(`${pageId}-page`);
  if (page) page.classList.add("active");
}

function hidePage(pageId) {
  const page = document.getElementById(`${pageId}-page`);
  if (page) page.classList.remove("active");
}