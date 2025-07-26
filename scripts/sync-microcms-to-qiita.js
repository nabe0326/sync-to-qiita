#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const HtmlToMarkdownConverter = require('./utils/html-to-markdown');

// 開発環境でのみdotenvを読み込み
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (error) {
    // dotenvが利用できない場合は無視（GitHub Actionsなど）
  }
}

class MicroCMSQiitaSync {
  constructor() {
    this.microCMSConfig = {
      domain: process.env.MICROCMS_DOMAIN,
      apiKey: process.env.MICROCMS_API_KEY,
      endpoint: 'articles' // API endpoint名（必要に応じて変更）
    };
    
    this.qiitaConfig = {
      accessToken: process.env.QIITA_ACCESS_TOKEN,
      baseURL: 'https://qiita.com/api/v2'
    };
    
    this.originalSiteUrl = process.env.ORIGINAL_SITE_URL;
    this.syncHistoryPath = path.join(process.cwd(), 'sync-history.json');
    this.converter = new HtmlToMarkdownConverter();
    
    this.validateConfig();
  }

  validateConfig() {
    const required = [
      'MICROCMS_DOMAIN',
      'MICROCMS_API_KEY', 
      'QIITA_ACCESS_TOKEN'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  async getMicroCMSArticles() {
    try {
      console.log('Fetching articles from microCMS...');
      
      const response = await axios.get(
        `https://${this.microCMSConfig.domain}.microcms.io/api/v1/${this.microCMSConfig.endpoint}`,
        {
          headers: {
            'X-MICROCMS-API-KEY': this.microCMSConfig.apiKey
          },
          params: {
            limit: 100, // 最大100件取得
            fields: 'id,title,content,excerpt,category,tags,publishedAt,updatedAt,revisedAt'
          }
        }
      );
      
      // 公開済みの記事のみをフィルタ
      const publishedArticles = response.data.contents.filter(article => 
        article.publishedAt && !article.publishedAt.includes('draft')
      );
      
      console.log(`Found ${publishedArticles.length} published articles`);
      return publishedArticles;
      
    } catch (error) {
      console.error('Failed to fetch microCMS articles:', error.response?.data || error.message);
      throw error;
    }
  }

  loadSyncHistory() {
    try {
      if (fs.existsSync(this.syncHistoryPath)) {
        const data = fs.readFileSync(this.syncHistoryPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load sync history, starting fresh:', error.message);
    }
    
    return {
      lastSyncTime: null,
      articles: {}
    };
  }

  saveSyncHistory(history) {
    try {
      fs.writeFileSync(this.syncHistoryPath, JSON.stringify(history, null, 2));
      console.log('Sync history saved');
    } catch (error) {
      console.error('Failed to save sync history:', error.message);
    }
  }

  shouldSyncArticle(article, history) {
    const articleHistory = history.articles[article.id];
    
    if (!articleHistory) {
      return { shouldSync: true, action: 'create' };
    }
    
    // 更新日時を比較（updatedAt > revisedAt > publishedAt の優先順位）
    const microCMSUpdatedAt = article.updatedAt || article.revisedAt || article.publishedAt;
    const lastSyncedUpdatedAt = articleHistory.microCMSUpdatedAt;
    
    if (microCMSUpdatedAt && lastSyncedUpdatedAt && 
        new Date(microCMSUpdatedAt) > new Date(lastSyncedUpdatedAt)) {
      return { shouldSync: true, action: 'update', qiitaId: articleHistory.qiitaId };
    }
    
    return { shouldSync: false, action: 'skip' };
  }

  async createQiitaArticle(article) {
    const tags = this.converter.processTags(article.category, article.tags);
    const originalUrl = this.originalSiteUrl ? `${this.originalSiteUrl}/articles/${article.id}` : null;
    
    const body = this.converter.convert(article.content, {
      excerpt: article.excerpt,
      originalUrl: originalUrl,
      originalTitle: article.title
    });

    const payload = {
      title: article.title,
      body: body,
      tags: tags,
      private: false
    };

    try {
      console.log(`Creating article: ${article.title}`);
      console.log('📄 Payload preview:');
      console.log(`- Title: ${payload.title}`);
      console.log(`- Tags: ${JSON.stringify(payload.tags)}`);
      console.log(`- Body length: ${payload.body.length} characters`);
      console.log(`- Private: ${payload.private}`);
      
      const response = await axios.post(
        `${this.qiitaConfig.baseURL}/items`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.qiitaConfig.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Created: ${article.title} (ID: ${response.data.id})`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Failed to create article: ${article.title}`);
      console.error('Error details:');
      console.error('- Status:', error.response?.status);
      console.error('- Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('- Headers:', error.response?.headers);
      
      // デバッグ用にペイロードも出力
      console.error('📋 Full payload that caused error:');
      console.error(JSON.stringify(payload, null, 2));
      
      throw error;
    }
  }

  async updateQiitaArticle(article, qiitaId) {
    const tags = this.converter.processTags(article.category, article.tags);
    const originalUrl = this.originalSiteUrl ? `${this.originalSiteUrl}/articles/${article.id}` : null;
    
    const body = this.converter.convert(article.content, {
      excerpt: article.excerpt,
      originalUrl: originalUrl,
      originalTitle: article.title
    });

    const payload = {
      title: article.title,
      body: body,
      tags: tags,
      private: false
    };

    try {
      console.log(`Updating article: ${article.title}`);
      
      const response = await axios.patch(
        `${this.qiitaConfig.baseURL}/items/${qiitaId}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.qiitaConfig.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Updated: ${article.title} (ID: ${qiitaId})`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Failed to update article: ${article.title}`);
      console.error('Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async syncArticles() {
    try {
      console.log('🚀 Starting microCMS to Qiita sync...');
      
      const articles = await this.getMicroCMSArticles();
      const history = this.loadSyncHistory();
      
      let syncCount = 0;
      let errorCount = 0;
      const maxArticles = 50; // 1回の実行で最大50記事まで処理
      
      for (const article of articles.slice(0, maxArticles)) {
        try {
          const syncDecision = this.shouldSyncArticle(article, history);
          
          if (!syncDecision.shouldSync) {
            console.log(`⏭️  Skipping: ${article.title} (no changes)`);
            continue;
          }
          
          let qiitaArticle;
          
          if (syncDecision.action === 'create') {
            qiitaArticle = await this.createQiitaArticle(article);
          } else if (syncDecision.action === 'update') {
            qiitaArticle = await this.updateQiitaArticle(article, syncDecision.qiitaId);
          }
          
          // 履歴を更新
          history.articles[article.id] = {
            qiitaId: qiitaArticle.id,
            title: article.title,
            lastSyncedAt: new Date().toISOString(),
            microCMSUpdatedAt: article.updatedAt || article.revisedAt || article.publishedAt
          };
          
          syncCount++;
          
          // API制限を考慮して2秒待機
          if (syncCount < articles.length) {
            console.log('⏳ Waiting 2 seconds...');
            await this.sleep(2000);
          }
          
        } catch (error) {
          errorCount++;
          console.error(`Error processing article ${article.title}:`, error.message);
          // エラーが発生しても他の記事の処理は継続
          continue;
        }
      }
      
      // 同期履歴を保存
      history.lastSyncTime = new Date().toISOString();
      this.saveSyncHistory(history);
      
      console.log('\n📊 Sync Summary:');
      console.log(`✅ Successfully synced: ${syncCount} articles`);
      console.log(`❌ Errors: ${errorCount} articles`);
      console.log(`📅 Last sync: ${history.lastSyncTime}`);
      
      if (errorCount > 0) {
        process.exit(1); // エラーがあった場合は非ゼロで終了
      }
      
    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      process.exit(1);
    }
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  const sync = new MicroCMSQiitaSync();
  sync.syncArticles();
}

module.exports = MicroCMSQiitaSync;