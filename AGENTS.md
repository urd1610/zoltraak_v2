<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## サブエージェントの活用

調査・広��な検索・並列タスク���が有効な開発作業では、メインの応答に任せきりにせず**サブエージェント�的に使う**。タスクを分割し、可能なら複数サブエージェントを並列起動して待ち時間とコンテキスト消��を抑える。

### サブエージェント用モデル（未指定時のデフォルト）

ユーザーまたはタスクから**サブエージェント用モデルが明示されていない**場合、メインがどの系統かに応じて次を既定とする。

| メインの系統 | サブエージェント既定 |
|-------------|---------------------|
| Anthropic（Claude）系 | `haiku` |
| OpenAI 系 | `mini` |

メインが上記以外、または混在・不明な場合は、プロジェクトで一般的に��量・低コスト寄りのモデルをサブエージェントに割り当て、ユーザーが別途指定したときはそれに��う。
