&lt;!-- BEGIN:nextjs-agent-rules --&gt;

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices. &lt;!-- END:nextjs-agent-rules --&gt;

## サブエージェントの活用

調査・広範な検索・並列タスク・試行錯誤が有効な開発作業では、メインの応答に任せきりにせず**サブエージェントを積極的に使う**。タスクを分割し、可能なら複数サブエージェントを並列起動して待ち時間とコンテキスト消耗を抑える。

### サブエージェント用モデル（未指定時のデフォルト）

ユーザーまたはタスクから**サブエージェント用モデルが明示されていない**場合、メインがどの系統かに応じて次を既定とする。

| メインの系統 | サブエージェント既定 |
| --- | --- |
| Anthropic（Claude）系 | `haiku` |
| OpenAI 系 | `mini xhigh` |

メインが上記以外、または混在・不明な場合は、プロジェクトで一般的に軽量・低コスト寄りのモデルをサブエージェントに割り当て、ユーザーが別途指定したときはそれに従う。