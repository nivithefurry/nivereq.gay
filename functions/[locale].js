import { renderHomePage } from "./_utils/discordComponentEmbed.js";

export async function onRequest(context) {
  const { locale } = context.params;
  if (locale !== "pl" && locale !== "en") return new Response("Not found", { status: 404 });
  return renderHomePage(context, locale);
}
