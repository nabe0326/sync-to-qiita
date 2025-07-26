#!/usr/bin/env node

const MicroCMSQiitaSync = require('./sync-microcms-to-qiita');

class TestSync extends MicroCMSQiitaSync {
  constructor() {
    super();
    console.log('🧪 TEST MODE: Will only process 1 article');
  }

  async syncArticles() {
    try {
      console.log('🚀 Starting TEST sync (1 article only)...');
      
      const articles = await this.getMicroCMSArticles();
      
      if (articles.length === 0) {
        console.log('❌ No articles found in microCMS');
        return;
      }

      const history = this.loadSyncHistory();
      
      // テスト用: 最初の1記事のみ処理
      const testArticle = articles[0];
      console.log(`\n📝 Test article: ${testArticle.title}`);
      console.log(`📅 Published: ${testArticle.publishedAt}`);
      console.log(`🔗 ID: ${testArticle.id}`);
      
      // 記事の詳細データを表示
      console.log(`\n🔍 Article data structure:`);
      console.log(`- Category:`, testArticle.category);
      console.log(`- Tags:`, testArticle.tags);
      console.log(`- Content length:`, testArticle.content ? testArticle.content.length : 'N/A');
      console.log(`- Excerpt:`, testArticle.excerpt ? 'Present' : 'N/A');
      
      const syncDecision = this.shouldSyncArticle(testArticle, history);
      console.log(`🤔 Sync decision: ${syncDecision.action}`);
      
      if (!syncDecision.shouldSync) {
        console.log(`⏭️  Article already synced and up to date`);
        console.log(`📊 Current sync history:`);
        console.log(JSON.stringify(history.articles[testArticle.id], null, 2));
        return;
      }
      
      // ユーザーに確認を求める
      console.log('\n⚠️  About to sync this article to Qiita. Continue? (y/N)');
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', async (key) => {
        if (key === 'y' || key === 'Y') {
          console.log('\n✅ Proceeding with sync...');
          
          try {
            let qiitaArticle;
            
            if (syncDecision.action === 'create') {
              qiitaArticle = await this.createQiitaArticle(testArticle);
            } else if (syncDecision.action === 'update') {
              qiitaArticle = await this.updateQiitaArticle(testArticle, syncDecision.qiitaId);
            }
            
            // 履歴を更新
            history.articles[testArticle.id] = {
              qiitaId: qiitaArticle.id,
              title: testArticle.title,
              lastSyncedAt: new Date().toISOString(),
              microCMSUpdatedAt: testArticle.updatedAt || testArticle.revisedAt || testArticle.publishedAt
            };
            
            history.lastSyncTime = new Date().toISOString();
            this.saveSyncHistory(history);
            
            console.log('\n🎉 Test sync completed successfully!');
            console.log(`🔗 Qiita article URL: https://qiita.com/items/${qiitaArticle.id}`);
            
          } catch (error) {
            console.error('\n❌ Test sync failed:', error.message);
          }
          
          process.exit(0);
          
        } else {
          console.log('\n❌ Sync cancelled');
          process.exit(0);
        }
      });
      
    } catch (error) {
      console.error('❌ Test sync failed:', error.message);
      process.exit(1);
    }
  }
}

// テスト実行
const testSync = new TestSync();
testSync.syncArticles();