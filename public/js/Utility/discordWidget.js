const discordWidgetUrl = "https://discord.com/api/guilds/1325743148432887818/widget.json";
const discordGuildId = "1325743148432887818";

class DiscordWidget {
  constructor(container, endpoint, refreshInterval = 60_000) {
    this.container = container;
    this.endpoint = endpoint;
    this.refreshInterval = refreshInterval;
    this.inviteUrl = null;
    this.guildIconUrl = null;
    this.renderPlaceholder();
    this.refresh();
    window.setInterval(() => this.refresh(), this.refreshInterval);
  }

  renderPlaceholder(message = "") {
    this.container.replaceChildren();
    const icon = document.createElement("span");
    icon.className = "community-icon";
    icon.innerHTML = '<i class="bi bi-discord" aria-hidden="true"></i>';

    const copy = document.createElement("div");
    copy.className = "community-copy";
    const name = document.createElement("h3");
    name.className = "server-name";
    name.textContent = "nivereq";
    const status = document.createElement("span");
    status.className = "community-status";
    status.textContent = message || window.siteTranslations?.widgets?.discordUnavailable || "";
    copy.append(name, status);

    this.container.append(icon, copy);
  }

  setOnlineCount(count) {
    const status = this.container.querySelector(".community-status");
    if (!status) return;
    status.replaceChildren();
    const dot = document.createElement("span");
    dot.className = "status-dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = window.siteTranslations.widgets.discordOnline.replace("{count}", count);
    status.append(dot, label);
  }

  async refresh() {
    await window.translationsReady;
    try {
      const response = await fetch(this.endpoint);
      if (!response.ok) throw new Error(`Discord widget request failed (${response.status}).`);
      const data = await response.json();
      const serverName = String(data.name || "").trim();
      this.inviteUrl = data.instant_invite || null;
      const name = document.querySelector("#discord-widget .server-name");
      if (name) name.textContent = serverName || "Discord";
      const icon = document.querySelector("#discord-widget .community-icon");
      if (icon) {
        if (!this.guildIconUrl && data.icon) {
          this.guildIconUrl = `https://cdn.discordapp.com/icons/${discordGuildId}/${data.icon}.png?size=128`;
        }
        if (!this.guildIconUrl && this.inviteUrl) {
          this.guildIconUrl = await this.fetchGuildIcon(this.inviteUrl);
        }
        if (this.guildIconUrl) {
          const image = document.createElement("img");
          image.src = this.guildIconUrl;
          image.alt = "";
          image.width = 48;
          image.height = 48;
          image.onerror = () => { image.remove(); };
          icon.replaceChildren(image);
        }
      }
      this.setOnlineCount(Number(data.presence_count) || 0);
      if (this.inviteUrl) {
        this.container.classList.add("is-clickable");
        this.container.setAttribute("role", "link");
        this.container.setAttribute("tabindex", "0");
        this.container.onclick = () => window.open(this.inviteUrl, "_blank", "noopener,noreferrer");
        this.container.onkeydown = (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            window.open(this.inviteUrl, "_blank", "noopener,noreferrer");
          }
        };
      }
    } catch (error) {
      console.info("Discord live status is unavailable.", error);
      if (!this.container.querySelector(".status-dot")) this.renderPlaceholder();
    }
  }

  async fetchGuildIcon(inviteUrl) {
    try {
      const inviteCode = new URL(inviteUrl).pathname.split("/").filter(Boolean).at(-1);
      if (!inviteCode) return null;
      const response = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(inviteCode)}`);
      if (!response.ok) return null;
      const invite = await response.json();
      if (invite.guild?.id !== discordGuildId || !invite.guild.icon) return null;
      return `https://cdn.discordapp.com/icons/${discordGuildId}/${invite.guild.icon}.png?size=128`;
    } catch {
      return null;
    }
  }
}

const discordContainer = document.getElementById("discord-widget");
if (discordContainer) new DiscordWidget(discordContainer, discordWidgetUrl);
