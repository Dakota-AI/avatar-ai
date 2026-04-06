// ============================
// Nav scroll effect
// ============================
const nav = document.getElementById('nav')
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20)
}, { passive: true })

// ============================
// Smooth scroll for all anchor links
// ============================
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault()
    const target = document.querySelector(link.getAttribute('href'))
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
})

// ============================
// Copy script snippet
// ============================
function copySnippet() {
  const text = '<script src="cdn.avatarAI.com/v1.js"><\/script>'
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copy-btn')
    const original = btn.textContent
    btn.textContent = 'Copied!'
    btn.style.color = '#86efac'
    setTimeout(() => {
      btn.textContent = original
      btn.style.color = ''
    }, 2000)
  }).catch(() => {
    const btn = document.getElementById('copy-btn')
    btn.textContent = 'Copy failed'
    setTimeout(() => { btn.textContent = 'Copy' }, 2000)
  })
}

// Expose to HTML onclick
window.copySnippet = copySnippet

// ============================
// Waitlist form submission
// ============================
async function submitWaitlist(e) {
  e.preventDefault()

  const email = document.getElementById('email-input').value.trim()
  const name = document.getElementById('name-input').value.trim()
  const submitBtn = document.getElementById('submit-btn')
  const errorEl = document.getElementById('form-error')

  // Clear previous error
  errorEl.textContent = ''

  // Basic validation
  if (!email) {
    errorEl.textContent = 'Please enter your email address.'
    return
  }

  // Loading state
  submitBtn.disabled = true
  submitBtn.textContent = 'Saving your spot...'

  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name })
    })

    const data = await res.json()

    if (data.success) {
      if (data.duplicate) {
        document.getElementById('form-success').querySelector('h3').textContent = "You're already on the list!"
        document.getElementById('form-success').querySelector('p').textContent = "We haven't forgotten about you — we'll be in touch soon."
      }
      document.getElementById('form-container').style.display = 'none'
      document.getElementById('form-success').classList.add('visible')
    } else {
      errorEl.textContent = data.error || 'Something went wrong. Please try again.'
      submitBtn.disabled = false
      submitBtn.textContent = 'Claim my spot'
    }
  } catch {
    errorEl.textContent = 'Connection error. Please check your internet and try again.'
    submitBtn.disabled = false
    submitBtn.textContent = 'Claim my spot'
  }
}

// Expose to HTML onsubmit
window.submitWaitlist = submitWaitlist
