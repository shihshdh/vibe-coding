import { TAROT_DECK } from '../data/tarotDeck';

/**
 * 构建塔罗牌解读的消息数组
 * 五张牌对应位置：过去 / 现在 / 未来 / 建议 / 结果（凯尔特十字简化版）
 */
export function buildTarotReadingMessages(question, cards) {
  const positions = ['过去', '现在', '未来', '建议', '结果'];
  const cardsDesc = cards
    .map((c, i) => {
      const tarot = TAROT_DECK.find((t) => t.id === c.tarotId);
      if (!tarot) return '';
      const orientation = c.reversed ? '逆位' : '正位';
      const keywords = c.reversed ? tarot.keywordsReversed : tarot.keywords;
      return `- 第${i + 1}张【${positions[i]}】：${tarot.nameZh} (${tarot.nameEn}) · ${orientation}\n  关键词：${keywords.join('、')}\n  基础含义：${tarot.meaning}`;
    })
    .join('\n');

  const systemPrompt = `你是一位富有智慧和同理心的塔罗占卜师，融合荣格心理学与神秘学传统。
你的解读风格：
- 直接开始解读，不要说"让我为你解读"或任何开场寒暄
- 语言凝练优美，避免玄幻术语堆砌，避免空洞的修辞
- 每一句都要有具体信息量，不重复不凑字数
- 诚实但温柔：即使牌面不利也要指出转机和行动方向
- 严格结合求问者的具体问题来解读
- 用中文回答，总字数控制在 250-400 字之内`;

  const userPrompt = `我的问题：${question || '（求问者未明确提问，请就当下处境给出指引）'}

我抽到了以下 5 张牌（凯尔特十字简化牌阵）：
${cardsDesc}

请按照以下结构简洁地为我解读（严格控制字数）：

【牌阵综观】
（1-2 句话的整体基调，不超过 50 字）

【逐张解析】
（每张牌 1-2 句话，结合具体问题语境；不要复述关键词，要给出洞察）

【核心指引】
（综合给出 2-3 句行动建议，具体可执行）`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}
