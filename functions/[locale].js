import { renderHomePage } from "./_utils/discordComponentEmbed.js";

export async function onRequest(context) {
  const { locale } = context.params;
  if (locale !== "pl" && locale !== "en") return context.env.ASSETS.fetch(context.request);
  return renderHomePage(context, locale);
}
