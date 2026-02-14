const jsonAPI =
  "https://discord.com/api/guilds/1325743148432887818/widget.json";

class DiscordWidget {
  constructor(containerId, jsonURL, refreshInterval = 30000) {
    this.container = document.getElementById(containerId);
    this.jsonURL = jsonURL;
    this.refreshInterval = refreshInterval;
    this.inviteURL = null;

    this.init();
  }

  init() {
    this.loadData();
    setInterval(() => this.loadData(), this.refreshInterval);
  }

  getOnlineLabel(count) {
    if (currentLang === "pl") {
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
        const emojiRegex = /^\p{Extended_Pictographic}/u;

        let emoji = "";
        let restName = name;

        if (emojiRegex.test(name)) {
          emoji = name.match(emojiRegex)[0];
          restName = name.replace(emojiRegex, "").trim();
        }

        this.inviteURL = data.instant_invite;

        const onlineText = this.getOnlineLabel(data.presence_count);

        // 🔥 jeśli widget jeszcze nie wyrenderowany — budujemy HTML
        if (!this.container.querySelector(".server-name")) {
          this.container.innerHTML = `
            ${emoji ? `<div class="emoji">${emoji}</div>` : ""}
            <h3 class="server-name">${restName}</h3>

            <div class="status">
              <span class="dot"></span>
              <span class="online-text">${onlineText}</span>
            </div>
          `;

          this.container.onclick = () => {
            window.open(this.inviteURL, "_blank");
          };
        } else {
          // 🔥 aktualizujemy cały tekst (nie tylko liczbę)
          const onlineEl = this.container.querySelector(".online-text");
          if (onlineEl) {
            onlineEl.textContent = onlineText;
          }
        }
      })
      .catch(() => {
        console.warn("Discord widget refresh failed");
      });
  }
}

new DiscordWidget("discord-widget", jsonAPI, 60000);
