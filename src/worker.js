export default {
  async fetch(req, env) {
    const asset = await env.ASSETS.fetch(req);
    if (asset.status !== 404) return asset;
    return env.ASSETS.fetch(new Request(`${new URL(req.url).origin}/404.html`, req));
  },
};
