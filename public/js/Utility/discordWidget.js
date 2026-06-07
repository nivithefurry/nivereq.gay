// ==========================================
// 🎮 Discord Server Widget
// Fetches data from a public Discord Widget JSON to display online users.
// ==========================================

const jsonAPI = "https://discord.com/api/guilds/1325743148432887818/widget.json";

class DiscordWidget {
  constructor(containerId, jsonURL, refreshInterval = 30000) {
    this.container = document.getElementById(containerId);
    this.jsonURL = jsonURL;
    this.refreshInterval = refreshInterval;
    this.inviteURL = null;

    if (this.container) {
      this.init();
    }
  }

  // Start fetching data immediately, then set up the recurring interval
  init() {
    this.loadData();
    setInterval(() => this.loadData(), this.refreshInterval);
  }

  // Returns localized text for the online user count
  getOnlineLabel(count) {
    if (typeof currentLang !== 'undefined' && currentLang === "pl") {
      return `${count} osób online`;
    } else {
      return `${count} members online`;
    }
  }

  loadData() {
    fetch(this.jsonURL)
      .then((response) => response.json())
      .then((data) => {
        const name = data.name.trim();
        
        // Regex trick to check if the server name starts with an emoji
        const emojiRegex = /^\p{Extended_Pictographic}/u;

        let emoji = "";
        let restName = name;

        // If it starts with an emoji, split the emoji and text apart for styling
        if (emojiRegex.test(name)) {
          emoji = name.match(emojiRegex)[0];
          restName = name.replace(emojiRegex, "").trim();
        }

        this.inviteURL = data.instant_invite;
        const onlineText = this.getOnlineLabel(data.presence_count);

        // If the widget hasn't been built yet, generate the HTML structure
        if (!this.container.querySelector(".server-name")) {
          this.container.innerHTML = `
            ${emoji ? `<div class="emoji">${emoji}</div>` : ""}
            <h3 class="server-name">${restName}</h3>

            <div class="status">
              <span class="dot"></span>
              <span class="online-text">${onlineText}</span>
            </div>
          `;

          // Make the whole container clickable to open the invite link
          this.container.onclick = () => {
            window.open(this.inviteURL, "_blank");
          };
        } else {
          // If the widget is already built, just update the online text number
          const onlineEl = this.container.querySelector(".online-text");
          if (onlineEl) {
            onlineEl.textContent = onlineText;
          }
        }
      })
      .catch((err) => {
        console.warn("Discord widget refresh failed:", err);
      });
  }
}

// Initialize the widget to check every 60 seconds (60000ms)
new DiscordWidget("discord-widget", jsonAPI, 60000);