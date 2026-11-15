import { renderSocialSubpage } from "../_utils/subpageEmbeds.js";

export async function onRequest(context) {
  return renderSocialSubpage(context, "fursuit");
}
