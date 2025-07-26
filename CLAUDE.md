# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a microCMS to Qiita automatic synchronization system that automatically syncs blog articles from microCMS to Qiita. The system is designed to run on GitHub Actions and handles content conversion from HTML to Markdown.

## Architecture

- **microCMS**: Source CMS for article management
- **Qiita**: Target platform for technical article publishing  
- **GitHub Actions**: Automation execution environment (planned)
- **Sync History**: JSON-based tracking of synchronization state

## Key Data Files

- `api-articles-*.json`: Contains microCMS API field definitions including content structure (title, slug, content, excerpt, category, tags, etc.)
- `api-categories-*.json`: Contains category definitions for content classification
- `docs/document.md`: Comprehensive requirements specification in Japanese detailing the entire system architecture, data flow, and technical specifications

## Content Structure

Based on the API schema, articles contain:
- **title**: Article title
- **slug**: Article identifier
- **content**: Rich editor content (HTML format)
- **excerpt**: Article summary (rich editor)
- **category**: Multi-select categories (実装事例, 技術調査, 業務効率化, 開発Tips)
- **tags**: Single-select tags (Claude, GPT, Dify, プロンプトエンジニアリング, etc.)
- **target_audience**: Reader targeting (エンジニア向け, 企業向け, 両方)
- **difficulty_level**: Content difficulty (初級, 中級, 上級)

## Planned Implementation

According to the requirements document, the system will include:
- Main sync script: `scripts/sync-microcms-to-qiita.js`
- HTML to Markdown converter: `scripts/utils/html-to-markdown.js`
- GitHub Actions workflow: `.github/workflows/sync-to-qiita.yml`
- Sync history tracking: `sync-history.json`

## Development Status

This appears to be in the planning/requirements phase. The actual implementation scripts and GitHub Actions workflows have not been created yet. The project currently contains requirement specifications and API schema definitions.