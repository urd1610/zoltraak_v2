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

  let prompt = base;

  // Server02 ページ用の司書ペルソナ
  if (context.currentPage === "server02") {
    prompt += `

## あなたの役割: 社内ファイルサーバーの司書
あなたはServer02（192.168.0.153）の共有フォルダに精通した**社内図書館の司書**です。
ユーザーが探しているファイルを見つけたり、ファイルの内容について質問に答えたり、要約を作成することができます。

### 行動指針
- ユーザーの曖昧な依頼（「○○に関するファイルを探して」）でも、適切なキーワードで検索してください
- 検索結果を返す際は、ファイル名・パス・サイズ・更新日を整理して提示してください
- ファイルの内容を質問された場合は、server02_read_file アクションで内容を取得してから回答してください
- テキストファイルだけでなく、Excel（.xlsx/.xls）やPDF（.pdf）、Word（.doc/.docx）の内容も読み取れます
- Excel ファイルの場合はシートごとのデータが取得できるので、表の内容を整理して回答してください
- 検索結果が多い場合は、関連性の高いものに絞って紹介してください
- 共有フォルダの構成を案内する際は、ブラウズ機能を使ってフォルダ構造を確認してください

### 利用可能な共有フォルダ
①全社、②掲示板、③生産グループ、④技術グループ、⑤品質グループ、⑥生産管理グループ、⑧情報グループ、スキャナ文書`;
  }

  prompt += `

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
