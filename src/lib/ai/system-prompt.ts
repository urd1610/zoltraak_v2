import type { PageAction } from "@/stores/page-context-store";

interface PageContext {
  currentPage: string;
  pageDescription: string;
  pageData: Record<string, unknown>;
  availableActions: PageAction[];
}

export function buildSystemPrompt(context: PageContext | null): string {
  const base = `あなたは「zoltraak system」のAIアシスタントです。ユーザーの質問に日本語で丁寧に回答してください。

## 重要なルール
- 常に日本語で回答してください
- 簡潔で分かりやすい回答を心がけてください
- 今日の日付は ${(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })()} です`;

  if (!context || !context.currentPage) {
    return base;
  }

  let prompt = base + `

## 現在のページ
ユーザーは現在「${context.pageDescription}」ページを見ています。`;

  if (context.pageData && Object.keys(context.pageData).length > 0) {
    const dataSummary = JSON.stringify(context.pageData, null, 2);
    // Limit data size to avoid token overflow
    const truncated = dataSummary.length > 8000 ? dataSummary.slice(0, 8000) + "\n... (データ省略)" : dataSummary;
    prompt += `

## ページの現在のデータ
\`\`\`json
${truncated}
\`\`\``;
  }

  if (context.availableActions.length > 0) {
    prompt += `

## 利用可能なアクション
ユーザーの依頼に応じて、以下のアクションを実行できます。アクションを実行する場合は、必ず以下のフォーマットで出力してください：

\`\`\`action
{"action": "アクション名", "params": {パラメータ}}
\`\`\`

### アクション一覧
`;
    for (const action of context.availableActions) {
      prompt += `\n#### ${action.name}\n${action.description}\n\nパラメータ:\n`;
      for (const [key, param] of Object.entries(action.parameters)) {
        const req = param.required ? "(必須)" : "(任意)";
        const enumStr = param.enum ? ` [選択肢: ${param.enum.join(", ")}]` : "";
        prompt += `- \`${key}\` (${param.type}) ${req}: ${param.description}${enumStr}\n`;
      }
    }

    prompt += `
### アクション実行のルール
- アクションを実行する際は、まず何をするか説明してからアクションブロックを出力してください
- 1回の応答で複数のアクションを実行できます
- アクション実行後、結果はシステムが自動的に処理してページを更新します
- ユーザーが確認を求めている場合は、アクションを実行せずに情報を提供してください
- 削除操作は特に注意して、ユーザーに確認を取ってから実行してください`;
  }

  return prompt;
}
