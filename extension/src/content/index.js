console.log('[Automation Bridge] Content script injected');

// Listen for commands from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Automation Bridge] Content script received:', request);

  if (request.action === 'scrapeProfile') {
    scrapeProfileData();
  } else if (request.action === 'connect') {
    sendConnection(request.message);
  } else if (request.action === 'message') {
    sendMessage(request.message);
  }
  
  return true; // Keep channel open for async response
});

// Helper: Wait for element to exist
async function waitForElement(selector, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
}

// Helper: Random human-like delay
const delay = (minMs, maxMs) => new Promise(r => setTimeout(r, Math.random() * (maxMs - minMs) + minMs));

// Smooth auto-scroll to make viewing look natural
async function humanScroll() {
  const steps = Math.floor(Math.random() * 4) + 2;
  for (let i = 0; i < steps; i++) {
    window.scrollBy({ top: Math.random() * 400 + 100, behavior: 'smooth' });
    await delay(1000, 3000);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await delay(1000, 2000);
}

// ─── Profile Scraper ───
async function scrapeProfileData() {
  try {
    console.log('[Automation Bridge] Starting profile scrape...');
    
    // Wait for the profile page to render
    await waitForElement('main.scaffold-layout__main', 10000);
    await delay(2000, 4000); // Human-like wait for full render

    // Scroll down naturally to load dynamic sections
    await humanScroll();

    const data = {
      firstName: '',
      lastName: '',
      title: '',
      company: '',
      location: '',
      about: '',
      linkedinUrl: window.location.href.split('?')[0],
      avatar: '',
      connectionDegree: '',
      profileId: '',
    };

    // ─── Name ───
    // Try multiple selectors since LinkedIn changes them
    const nameEl = document.querySelector('h1.text-heading-xlarge') 
      || document.querySelector('h1.inline.t-24')
      || document.querySelector('[data-anonymize="person-name"]')
      || document.querySelector('h1');
    
    if (nameEl) {
      const fullName = nameEl.textContent.trim();
      const parts = fullName.split(' ');
      data.firstName = parts[0] || '';
      data.lastName = parts.slice(1).join(' ') || '';
    }

    // ─── Headline (Title) ───
    const headlineEl = document.querySelector('div.text-body-medium.break-words')
      || document.querySelector('.pv-top-card--list .text-body-medium')
      || document.querySelector('[data-anonymize="headline"]');
    
    if (headlineEl) {
      data.title = headlineEl.textContent.trim();
    }

    // ─── Company ───
    // Try to extract from experience section or from the top card
    const companyEl = document.querySelector('div.inline-show-more-text--is-collapsed')
      || document.querySelector('button[aria-label*="Current company"]')
      || document.querySelector('.pv-top-card--experience-list-item');
    
    if (companyEl) {
      data.company = companyEl.textContent.trim().split('\n')[0].trim();
    }

    // Fallback: Extract company from headline "Title at Company"
    if (!data.company && data.title) {
      const atMatch = data.title.match(/(?:at|@)\s+(.+)$/i);
      if (atMatch) {
        data.company = atMatch[1].trim();
      }
    }

    // ─── Location ───
    const locationEl = document.querySelector('span.text-body-small.inline.t-black--light.break-words')
      || document.querySelector('.pv-top-card--list-bullet .text-body-small');
    
    if (locationEl) {
      data.location = locationEl.textContent.trim();
    }

    // ─── About ───
    const aboutSection = document.querySelector('#about ~ .display-flex .inline-show-more-text')
      || document.querySelector('section.pv-about-section .pv-about__summary-text')
      || document.querySelector('[data-anonymize="about-section"]');
    
    if (aboutSection) {
      data.about = aboutSection.textContent.trim().substring(0, 500); // Trim to 500 chars
    }

    // ─── Profile Photo ───
    const avatarEl = document.querySelector('img.pv-top-card-profile-picture__image--show')
      || document.querySelector('img.profile-photo-edit__preview')
      || document.querySelector('.pv-top-card__photo img');
    
    if (avatarEl) {
      data.avatar = avatarEl.src || '';
    }

    // ─── Connection Degree ───
    const degreeEl = document.querySelector('.dist-value')
      || document.querySelector('span.text-body-small[aria-hidden]');
    
    if (degreeEl) {
      const degreeText = degreeEl.textContent.trim();
      if (degreeText.includes('1st')) data.connectionDegree = '1st';
      else if (degreeText.includes('2nd')) data.connectionDegree = '2nd';
      else if (degreeText.includes('3rd')) data.connectionDegree = '3rd';
    }

    // ─── Premium Status ───
    const premiumEl = document.querySelector('.pv-member-badge--premium')
      || document.querySelector('[aria-label*="Premium"]')
      || document.querySelector('.premium-icon')
      || document.querySelector('svg.pe-hub-icon--premium');
    
    data.isPremium = !!premiumEl;

    // ─── Profile ID from URL ───
    const urlMatch = window.location.pathname.match(/\/in\/([^/]+)/);
    if (urlMatch) {
      data.profileId = urlMatch[1];
    }

    // Clean up the URL (normalize both /in/john-doe and /in/ACwAABd...)
    if (!data.linkedinUrl.includes('/in/') && window.location.href.includes('/in/')) {
      data.linkedinUrl = window.location.href.split('?')[0];
    }

    console.log('[Automation Bridge] Scraped profile data:', data);

    // Send data back to background script
    chrome.runtime.sendMessage({ 
      type: 'PROFILE_DATA', 
      payload: {
        action: 'scrapeProfile',
        status: 'success',
        profileData: data
      }
    });

  } catch (err) {
    console.error('[Automation Bridge] Scrape failed:', err);
    chrome.runtime.sendMessage({ 
      type: 'ACTION_FAILED', 
      payload: { action: 'scrapeProfile', error: err.message } 
    });
  }
}

// Auto-Connect Logic
async function sendConnection(noteText) {
  try {
    await waitForElement('main.scaffold-layout__main');
    await humanScroll();

    let connectBtn = Array.from(document.querySelectorAll('button')).find(btn => {
      const label = btn.getAttribute('aria-label') || '';
      return label.includes('Invite') || btn.innerText.includes('Connect');
    });

    if (!connectBtn) {
      const moreBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.includes('More'));
      if (moreBtn) {
        moreBtn.click();
        await delay(500, 1500);
        connectBtn = Array.from(document.querySelectorAll('div[role="button"]')).find(div => div.innerText.includes('Connect'));
      }
    }

    if (!connectBtn) {
      throw new Error('Connect button not found on this profile');
    }

    connectBtn.click();
    await delay(1000, 2500);

    const addNoteBtn = await waitForElement('button[aria-label="Add a note"]');
    if (!addNoteBtn) throw new Error('Add note button not found in modal');

    if (noteText) {
      addNoteBtn.click();
      await delay(800, 1500);
      
      const textArea = document.querySelector('textarea[name="message"]');
      if (textArea) {
        textArea.value = noteText;
        textArea.dispatchEvent(new Event('input', { bubbles: true }));
        await delay(1500, 3000);
      }
    }

    const sendBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.includes('Send'));
    if (sendBtn && !sendBtn.disabled) {
      // sendBtn.click(); // COMMENTED OUT FOR SAFETY DURING DEVELOPMENT
      console.log('Would have clicked Send connection req here');
      
      chrome.runtime.sendMessage({ 
        type: 'ACTION_COMPLETED', 
        payload: { action: 'connect', status: 'success' } 
      });
    } else {
      throw new Error('Send button not active or found');
    }

  } catch (err) {
    console.error('LinkedIn Automation Failed:', err);
    chrome.runtime.sendMessage({ 
      type: 'ACTION_FAILED', 
      payload: { action: 'connect', error: err.message } 
    });
  }
}

function sendMessage(messageText) {
  console.log('Send message logic - to implement');
}
