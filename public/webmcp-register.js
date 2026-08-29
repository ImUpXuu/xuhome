// WebMCP 工具注册（命令式 API）
// 参考: https://github.com/webmachinelearning/webmcp

(function () {
  // 等待 modelContext 可用
  function whenReady(cb) {
    if (document.modelContext) return cb();
    document.addEventListener('modelcontextready', cb, { once: true });
    // 兜底：1秒后尝试
    setTimeout(function () {
      if (document.modelContext) cb();
    }, 1000);
  }

  whenReady(function () {
    var mc = document.modelContext;
    if (!mc) {
      console.log('[WebMCP] modelContext 不可用，跳过注册');
      return;
    }

    // 工具 1：搜索文章
    mc.registerTool({
      name: 'search_posts',
      description: '搜索博客文章，支持按标题、描述、标签、分类进行模糊匹配',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' }
        },
        required: ['query']
      },
      execute: function (args) {
        var q = args.query || '';
        var url = '/?q=' + encodeURIComponent(q);
        window.location.href = url;
        return { content: [{ type: 'text', text: '正在搜索: ' + q }] };
      }
    });

    // 工具 2：跳转到指定页码
    mc.registerTool({
      name: 'go_to_page',
      description: '跳转到文章列表的指定页码',
      inputSchema: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, description: '目标页码' }
        },
        required: ['page']
      },
      execute: function (args) {
        var p = parseInt(args.page, 10);
        if (isNaN(p) || p < 1) return { content: [{ type: 'text', text: '无效页码' }] };
        var url = p === 1 ? '/' : '/page/' + p + '/';
        window.location.href = url;
        return { content: [{ type: 'text', text: '跳转到第 ' p + ' 页' }] };
      }
    });

    // 工具 3：获取文章详情
    mc.registerTool({
      name: 'get_post',
      description: '打开指定文章的详情页',
      inputSchema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: '文章 slug，如 vercel-youxuan-cache' }
        },
        required: ['slug']
      },
      execute: function (args) {
        var slug = (args.slug || '').trim();
        if (!slug) return { content: [{ type: 'text', text: '缺少 slug 参数' }] };
        window.location.href = '/posts/' + encodeURIComponent(slug) + '/';
        return { content: [{ type: 'text', text: '打开文章: ' + slug }] };
      }
    });

    // 工具 4：搜索音乐
    mc.registerTool({
      name: 'search_music',
      description: '在网易云音乐中搜索歌曲或歌手',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词（歌曲名/歌手名）' }
        },
        required: ['query']
      },
      execute: function (args) {
        var q = args.query || '';
        // 触发音乐搜索（如果音乐播放器已加载）
        var event = new CustomEvent('webmcp-search-music', { detail: { query: q } });
        window.dispatchEvent(event);
        return { content: [{ type: 'text', text: '搜索音乐: ' + q }] };
      }
    });

    // 工具 5：向 AI 提问
    mc.registerTool({
      name: 'ask_ai',
      description: '向 AI 助手提问关于博客文章的问题',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: '要提问的内容' }
        },
        required: ['message']
      },
      execute: function (args) {
        var msg = args.message || '';
        // 触发 AI 聊天（如果已加载）
        var event = new CustomEvent('webmcp-ask-ai', { detail: { message: msg } });
        window.dispatchEvent(event);
        return { content: [{ type: 'text', text: '发送问题: ' + msg }] };
      }
    });

    // 工具 6：搜索友链
    mc.registerTool({
      name: 'search_friends',
      description: '搜索友情链接和好友博客',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词（好友昵称/博客名）' }
        },
        required: ['query']
      },
      execute: function (args) {
        var q = args.query || '';
        var event = new CustomEvent('webmcp-search-friends', { detail: { query: q } });
        window.dispatchEvent(event);
        return { content: [{ type: 'text', text: '搜索友链: ' + q }] };
      }
    });

    console.log('[WebMCP] 已注册 6 个工具');
  });
})();
