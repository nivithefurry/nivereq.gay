import { renderHomePage } from "./_utils/discordComponentEmbed.js";

export async function onRequest(context) {
  return renderHomePage(context, "en");
}
