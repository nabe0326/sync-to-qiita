const TurndownService = require('turndown');

class HtmlToMarkdownConverter {
  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      strongDelimiter: '**',
      emDelimiter: '*'
    });

    this.setupCustomRules();
  }

  setupCustomRules() {
    // カスタムルールを追加
    this.turndownService.addRule('codeBlock', {
      filter: function (node) {
        return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
      },
      replacement: function (content, node) {
        const className = node.firstChild.className || '';
        const language = className.match(/language-(\w+)/);
        const lang = language ? language[1] : '';
        
        return '\n\n```' + lang + '\n' + node.firstChild.textContent + '\n```\n\n';
      }
    });

    // 画像の alt 属性を適切に処理
    this.turndownService.addRule('image', {
      filter: 'img',
      replacement: function (content, node) {
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        const title = node.getAttribute('title');
        
        const titlePart = title ? ' "' + title + '"' : '';
        return src ? '![' + alt + '](' + src + titlePart + ')' : '';
      }
    });

    // リストアイテムの改行を適切に処理
    this.turndownService.addRule('listItem', {
      filter: 'li',
      replacement: function (content, node, options) {
        content = content
          .replace(/^\n+/, '')
          .replace(/\n+$/, '\n')
          .replace(/\n/gm, '\n    ');
        
        const prefix = options.bulletListMarker + ' ';
        return prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '');
      }
    });
  }

  convert(html, options = {}) {
    if (!html || typeof html !== 'string') {
      return '';
    }

    try {
      let markdown = this.turndownService.turndown(html);
      
      // 余分な改行を整理
      markdown = markdown
        .replace(/\n{3,}/g, '\n\n')  // 3個以上の連続改行を2個に
        .replace(/^\n+/, '')        // 先頭の改行を削除
        .replace(/\n+$/, '');       // 末尾の改行を削除

      // 概要を冒頭に追加する場合
      if (options.excerpt && options.excerpt.trim()) {
        const excerptMarkdown = this.turndownService.turndown(options.excerpt);
        if (excerptMarkdown) {
          markdown = excerptMarkdown + '\n\n' + markdown;
        }
      }

      // 記事の最後にXとブログサイトの紹介文を追加
      const footerSection = this.generateFooter();
      markdown = markdown + '\n\n' + footerSection;

      return markdown;
    } catch (error) {
      console.error('HTML to Markdown conversion failed:', error);
      return html; // 変換に失敗した場合は元のHTMLを返す
    }
  }

  // フッター部分を生成（Xとブログサイトの紹介）
  generateFooter() {
    return `---

## 🌟 お知らせ

この記事が役に立ったら、ぜひフォローやいいねをお願いします！

**🐦 X**: [@nabe_AI_dev](https://x.com/nabe_AI_dev)
AI開発の最新情報や技術Tips、開発の進捗などを定期的にツイートしています。

**📝 ブログ**: [AI Developer Blog](https://ai-developer-blog.vercel.app/)
AIツール開発に関する詳細な記事や実装事例を公開中です。`;
  }

  // Qiitaのタグ制限に合わせてタグを整理
  processTags(categories = [], tags = '', maxTags = 5) {
    const allTags = [];
    
    console.log('🏷️  Processing tags:');
    console.log('- Raw categories:', categories);
    console.log('- Raw tags:', tags);
    
    // カテゴリをタグに追加（relation形式の場合）
    if (Array.isArray(categories)) {
      categories.forEach(category => {
        if (category && typeof category === 'string') {
          allTags.push(category);
        } else if (category && category.name) {
          allTags.push(category.name);
        } else if (category && category.title) {
          allTags.push(category.title);
        }
      });
    } else if (categories && typeof categories === 'string') {
      allTags.push(categories);
    } else if (categories && categories.name) {
      allTags.push(categories.name);
    } else if (categories && categories.title) {
      allTags.push(categories.title);
    }
    
    // タグを追加（カンマ区切りのテキストフィールド）
    if (tags && typeof tags === 'string') {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      allTags.push(...tagArray);
    }

    // 重複を除去し、最大数に制限
    const uniqueTags = [...new Set(allTags)]
      .filter(tag => {
        if (!tag || typeof tag !== 'string') return false;
        const trimmed = tag.trim();
        return trimmed.length > 0 && trimmed.length <= 20; // Qiitaのタグ長制限
      })
      .slice(0, maxTags);

    console.log('- Processed tags:', uniqueTags);

    // デフォルトタグを追加（タグが空の場合）
    if (uniqueTags.length === 0) {
      uniqueTags.push('AI');
    }

    // Qiita API形式に変換
    const qiitaTags = uniqueTags.map(tag => ({ name: tag.trim() }));
    console.log('- Final Qiita tags:', qiitaTags);
    
    return qiitaTags;
  }
}

module.exports = HtmlToMarkdownConverter;